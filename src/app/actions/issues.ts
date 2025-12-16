'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  uuidSchema,
  createIssueSchema,
  updateIssueSchema,
  createCommentSchema,
  validateInput
} from '@/lib/validations'
import { z } from 'zod'
import type {
  Issue,
  IssueWithDetails,
  IssueComment,
  IssueAttachment,
  CreateIssueData,
  UpdateIssueData,
  IssueStatus,
  IssuePriority
} from '@/types/database'
import { uploadFileFromFormData, deleteFile, getSignedUrl } from './storage'
import { createIssueMentionNotification } from './notifications'
import { parseMentions, parseMentionsWithGroups } from '@/lib/utils/mentions'
import { verifyProjectMembership } from '@/lib/auth-helpers'

// Local validation schemas
const issueFiltersSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'all']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(),
  assignedTo: uuidSchema.optional(),
}).optional()

const addCommentSchema = z.object({
  issueId: uuidSchema,
  content: z.string().min(1, 'Kommentar krävs').max(5000, 'Kommentaren är för lång'),
})

const statusChangeCommentSchema = z.string().max(1000, 'Kommentaren är för lång').optional()

export async function getProjectIssues(
  projectId: string,
  filters?: {
    status?: IssueStatus | 'all'
    priority?: IssuePriority | 'all'
    assignedTo?: string
  }
): Promise<IssueWithDetails[]> {
  try {
    // Validate input
    const validatedProjectId = validateInput(uuidSchema, projectId)
    const validatedFilters = filters ? validateInput(issueFiltersSchema, filters) : undefined

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectIssues: User not authenticated')
      return []
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedProjectId, user.id)
    if (!hasAccess) {
      console.error('getProjectIssues: User not a member of project')
      return []
    }

    let query = supabase
      .from('issues')
      .select(`
        *,
        reporter:profiles!issues_reported_by_fkey(*),
        assignee:profiles!issues_assigned_to_fkey(*)
      `)
      .eq('project_id', validatedProjectId)
      .order('created_at', { ascending: false })

    if (validatedFilters?.status && validatedFilters.status !== 'all') {
      query = query.eq('status', validatedFilters.status)
    }
    if (validatedFilters?.priority && validatedFilters.priority !== 'all') {
      query = query.eq('priority', validatedFilters.priority)
    }
    if (validatedFilters?.assignedTo) {
      query = query.eq('assigned_to', validatedFilters.assignedTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching issues:', error)
      return []
    }

    return data as IssueWithDetails[]
  } catch (err) {
    console.error('getProjectIssues unexpected error:', err)
    return []
  }
}

export async function getIssue(issueId: string): Promise<IssueWithDetails | null> {
  try {
    // Validate input
    const validatedIssueId = validateInput(uuidSchema, issueId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getIssue: User not authenticated')
      return null
    }

    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        reporter:profiles!issues_reported_by_fkey(*),
        assignee:profiles!issues_assigned_to_fkey(*)
      `)
      .eq('id', validatedIssueId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching issue:', error)
      return null
    }

    // Verify user has access to the issue's project
    const hasAccess = await verifyProjectMembership(data.project_id, user.id)
    if (!hasAccess) {
      console.error('getIssue: User not a member of project')
      return null
    }

    return data as IssueWithDetails
  } catch (err) {
    console.error('getIssue unexpected error:', err)
    return null
  }
}

export async function createIssue(
  projectId: string,
  data: CreateIssueData
): Promise<Issue> {
  // Validate input
  const validatedProjectId = validateInput(uuidSchema, projectId)
  const validatedData = validateInput(createIssueSchema, { ...data, project_id: validatedProjectId })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: issue, error } = await supabase
    .from('issues')
    .insert({
      project_id: validatedProjectId,
      title: validatedData.title,
      description: validatedData.description || null,
      status: validatedData.status || 'open',
      priority: validatedData.priority || 'medium',
      location: validatedData.location || null,
      assigned_to: validatedData.assigned_to || null,
      due_date: validatedData.due_date || null,
      reported_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating issue:', error)
    throw new Error('Kunde inte skapa avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${validatedProjectId}/issues`)
  return issue
}

export async function updateIssue(
  issueId: string,
  data: UpdateIssueData,
  statusChangeComment?: string
): Promise<Issue> {
  // Validate input
  const validatedIssueId = validateInput(uuidSchema, issueId)
  const validatedData = validateInput(updateIssueSchema, data)
  const validatedComment = statusChangeComment ? validateInput(statusChangeCommentSchema, statusChangeComment) : undefined

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing issue
  const { data: existing } = await supabase
    .from('issues')
    .select('project_id, status')
    .eq('id', validatedIssueId)
    .single()

  if (!existing) {
    throw new Error('Ärendet hittades inte')
  }

  // Track if status is changing for audit trail
  const statusChanged = validatedData.status && validatedData.status !== existing.status

  // If status is changing to resolved, set resolved_at
  const updateData: Record<string, unknown> = {
    ...validatedData,
    updated_at: new Date().toISOString(),
  }

  if (validatedData.status === 'resolved' && existing.status !== 'resolved') {
    updateData.resolved_at = new Date().toISOString()
  } else if (validatedData.status && validatedData.status !== 'resolved') {
    updateData.resolved_at = null
  }

  const { data: issue, error } = await supabase
    .from('issues')
    .update(updateData)
    .eq('id', validatedIssueId)
    .select()
    .single()

  if (error) {
    console.error('Error updating issue:', error)
    throw new Error('Kunde inte uppdatera ärendet')
  }

  // Log status change to audit trail
  if (statusChanged && validatedData.status) {
    const { error: historyError } = await supabase
      .from('status_history')
      .insert({
        entity_type: 'issue',
        entity_id: validatedIssueId,
        old_status: existing.status,
        new_status: validatedData.status,
        changed_by: user.id,
        comment: validatedComment || null,
      })

    if (historyError) {
      // Log but don't fail the main operation
      console.error('Error logging status change to audit trail:', historyError)
    }
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/issues`)
  return issue
}

export async function deleteIssue(issueId: string): Promise<void> {
  // Validate input
  const validatedIssueId = validateInput(uuidSchema, issueId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get issue info first
  const { data: issue } = await supabase
    .from('issues')
    .select('project_id')
    .eq('id', validatedIssueId)
    .single()

  if (!issue) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Delete all attachments from storage first
  const { data: attachments } = await supabase
    .from('issue_attachments')
    .select('file_path')
    .eq('issue_id', validatedIssueId)

  if (attachments) {
    for (const attachment of attachments) {
      try {
        await deleteFile('issue-attachments', attachment.file_path)
      } catch {
        console.error('Warning: Could not delete attachment from storage')
      }
    }
  }

  // Delete the issue (cascade will delete comments and attachments)
  const { error } = await supabase
    .from('issues')
    .delete()
    .eq('id', validatedIssueId)

  if (error) {
    console.error('Error deleting issue:', error)
    throw new Error('Kunde inte radera avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${issue.project_id}/issues`)
}

// Issue Comments
export async function getIssueComments(issueId: string): Promise<IssueComment[]> {
  try {
    // Validate input
    const validatedIssueId = validateInput(uuidSchema, issueId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    // Get issue to find project_id
    const { data: issue } = await supabase
      .from('issues')
      .select('project_id')
      .eq('id', validatedIssueId)
      .single()

    if (!issue) return []

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(issue.project_id, user.id)
    if (!hasAccess) {
      console.error('getIssueComments: User not a member of project')
      return []
    }

    const { data, error } = await supabase
      .from('issue_comments')
      .select(`
        *,
        author:profiles!issue_comments_author_id_fkey(*)
      `)
      .eq('issue_id', validatedIssueId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching issue comments:', error)
      return []
    }

    return data
  } catch (err) {
    console.error('getIssueComments unexpected error:', err)
    return []
  }
}

export async function addIssueComment(
  issueId: string,
  content: string,
  mentionData?: {
    members: { user_id: string; full_name: string; email?: string }[]
    groups?: { id: string; name: string }[]
    issueTitle: string
    projectId: string
  }
): Promise<IssueComment> {
  // Validate input
  const validated = validateInput(addCommentSchema, { issueId, content })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get author's name for notification
  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: comment, error } = await supabase
    .from('issue_comments')
    .insert({
      issue_id: validated.issueId,
      content: validated.content,
      author_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding comment:', error)
    throw new Error('Kunde inte lägga till kommentaren')
  }

  // Parse mentions and create notifications
  if (mentionData) {
    // Use parseMentionsWithGroups if groups are provided
    const allMentionedUserIds = new Set<string>()

    if (mentionData.groups && mentionData.groups.length > 0) {
      const { userIds, groupIds } = parseMentionsWithGroups(validated.content, mentionData.members, mentionData.groups)

      // Add directly mentioned users
      userIds.forEach(id => allMentionedUserIds.add(id))

      // Expand group mentions to user IDs
      if (groupIds.length > 0) {
        const { data: groupMembers } = await supabase
          .from('project_members')
          .select('user_id')
          .in('group_id', groupIds)
          .eq('project_id', mentionData.projectId)
          .eq('status', 'active')

        if (groupMembers) {
          groupMembers.forEach(m => allMentionedUserIds.add(m.user_id))
        }
      }
    } else {
      // Fallback to regular parsing
      const mentionedUserIds = parseMentions(validated.content, mentionData.members)
      mentionedUserIds.forEach(id => allMentionedUserIds.add(id))
    }

    // Create notification for each mentioned user (except self)
    for (const mentionedUserId of allMentionedUserIds) {
      if (mentionedUserId !== user.id) {
        await createIssueMentionNotification(
          mentionedUserId,
          authorProfile?.full_name || 'Någon',
          mentionData.projectId,
          validated.issueId,
          mentionData.issueTitle,
          validated.content
        )
      }
    }
  }

  return comment
}

export async function deleteIssueComment(commentId: string): Promise<void> {
  // Validate input
  const validatedCommentId = validateInput(uuidSchema, commentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('issue_comments')
    .delete()
    .eq('id', validatedCommentId)

  if (error) {
    console.error('Error deleting comment:', error)
    throw new Error('Kunde inte radera kommentaren')
  }
}

// Issue Attachments
export async function getIssueAttachments(issueId: string): Promise<IssueAttachment[]> {
  try {
    // Validate input
    const validatedIssueId = validateInput(uuidSchema, issueId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    // Get issue to find project_id
    const { data: issue } = await supabase
      .from('issues')
      .select('project_id')
      .eq('id', validatedIssueId)
      .single()

    if (!issue) return []

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(issue.project_id, user.id)
    if (!hasAccess) {
      console.error('getIssueAttachments: User not a member of project')
      return []
    }

    const { data, error } = await supabase
      .from('issue_attachments')
      .select(`
        *,
        uploader:profiles!issue_attachments_uploaded_by_fkey(*)
      `)
      .eq('issue_id', validatedIssueId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching issue attachments:', error)
      return []
    }

    return data
  } catch (err) {
    console.error('getIssueAttachments unexpected error:', err)
    return []
  }
}

export async function addIssueAttachment(
  issueId: string,
  formData: FormData
): Promise<IssueAttachment> {
  // Validate input
  const validatedIssueId = validateInput(uuidSchema, issueId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the issue to get project_id for file path
  const { data: issue } = await supabase
    .from('issues')
    .select('project_id')
    .eq('id', validatedIssueId)
    .single()

  if (!issue) {
    throw new Error('Ärendet hittades inte')
  }

  // Upload file to storage using FormData
  const uploadResult = await uploadFileFromFormData('issue-attachments', issue.project_id, formData, validatedIssueId)

  // Create attachment record
  const { data: attachment, error } = await supabase
    .from('issue_attachments')
    .insert({
      issue_id: validatedIssueId,
      file_path: uploadResult.path,
      file_name: uploadResult.fileName,
      file_size: uploadResult.fileSize,
      file_type: uploadResult.fileType,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Try to clean up uploaded file
    try {
      await deleteFile('issue-attachments', uploadResult.path)
    } catch {
      // Ignore cleanup errors
    }
    console.error('Error creating attachment:', error)
    throw new Error('Kunde inte ladda upp bilagan')
  }

  return attachment
}

export async function deleteIssueAttachment(attachmentId: string): Promise<void> {
  // Validate input
  const validatedAttachmentId = validateInput(uuidSchema, attachmentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get attachment info
  const { data: attachment } = await supabase
    .from('issue_attachments')
    .select('file_path')
    .eq('id', validatedAttachmentId)
    .single()

  if (!attachment) {
    throw new Error('Bilagan hittades inte')
  }

  // Delete from storage
  try {
    await deleteFile('issue-attachments', attachment.file_path)
  } catch {
    console.error('Warning: Could not delete file from storage')
  }

  // Delete from database
  const { error } = await supabase
    .from('issue_attachments')
    .delete()
    .eq('id', validatedAttachmentId)

  if (error) {
    console.error('Error deleting attachment:', error)
    throw new Error('Kunde inte radera bilagan')
  }
}

export async function getAttachmentDownloadUrl(attachmentId: string): Promise<string> {
  // Validate input
  const validatedAttachmentId = validateInput(uuidSchema, attachmentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: attachment } = await supabase
    .from('issue_attachments')
    .select('file_path')
    .eq('id', validatedAttachmentId)
    .single()

  if (!attachment) {
    throw new Error('Bilagan hittades inte')
  }

  return getSignedUrl('issue-attachments', attachment.file_path, 3600)
}

// Stats
export async function getIssueStats(projectId: string): Promise<{
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
}> {
  try {
    // Validate input
    const validatedProjectId = validateInput(uuidSchema, projectId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 }
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedProjectId, user.id)
    if (!hasAccess) {
      console.error('getIssueStats: User not a member of project')
      return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 }
    }

    const { data, error } = await supabase
      .from('issues')
      .select('status')
      .eq('project_id', validatedProjectId)

    if (error) {
      console.error('Error fetching issue stats:', error)
      return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 }
    }

    const stats = {
      total: data?.length || 0,
      open: data?.filter(i => i.status === 'open').length || 0,
      inProgress: data?.filter(i => i.status === 'in_progress').length || 0,
      resolved: data?.filter(i => i.status === 'resolved').length || 0,
      closed: data?.filter(i => i.status === 'closed').length || 0,
    }

    return stats
  } catch (err) {
    console.error('getIssueStats unexpected error:', err)
    return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 }
  }
}
