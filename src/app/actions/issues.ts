'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
import { uploadFile, deleteFile, getSignedUrl } from './storage'
import { createIssueMentionNotification } from './notifications'
import { parseMentions, parseMentionsWithGroups } from '@/lib/utils/mentions'

export async function getProjectIssues(
  projectId: string,
  filters?: {
    status?: IssueStatus | 'all'
    priority?: IssuePriority | 'all'
    assignedTo?: string
  }
): Promise<IssueWithDetails[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectIssues: User not authenticated')
      return []
    }

    let query = supabase
      .from('issues')
      .select(`
        *,
        reporter:profiles!issues_reported_by_fkey(*),
        assignee:profiles!issues_assigned_to_fkey(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
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
      .eq('id', issueId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching issue:', error)
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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: issue, error } = await supabase
    .from('issues')
    .insert({
      project_id: projectId,
      title: data.title,
      description: data.description || null,
      status: data.status || 'open',
      priority: data.priority || 'medium',
      location: data.location || null,
      assigned_to: data.assigned_to || null,
      due_date: data.due_date || null,
      reported_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating issue:', error)
    throw new Error('Kunde inte skapa avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${projectId}/issues`)
  return issue
}

export async function updateIssue(
  issueId: string,
  data: UpdateIssueData,
  statusChangeComment?: string
): Promise<Issue> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing issue
  const { data: existing } = await supabase
    .from('issues')
    .select('project_id, status')
    .eq('id', issueId)
    .single()

  if (!existing) {
    throw new Error('Ärendet hittades inte')
  }

  // Track if status is changing for audit trail
  const statusChanged = data.status && data.status !== existing.status

  // If status is changing to resolved, set resolved_at
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  if (data.status === 'resolved' && existing.status !== 'resolved') {
    updateData.resolved_at = new Date().toISOString()
  } else if (data.status && data.status !== 'resolved') {
    updateData.resolved_at = null
  }

  const { data: issue, error } = await supabase
    .from('issues')
    .update(updateData)
    .eq('id', issueId)
    .select()
    .single()

  if (error) {
    console.error('Error updating issue:', error)
    throw new Error('Kunde inte uppdatera ärendet')
  }

  // Log status change to audit trail
  if (statusChanged && data.status) {
    const { error: historyError } = await supabase
      .from('status_history')
      .insert({
        entity_type: 'issue',
        entity_id: issueId,
        old_status: existing.status,
        new_status: data.status,
        changed_by: user.id,
        comment: statusChangeComment || null,
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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get issue info first
  const { data: issue } = await supabase
    .from('issues')
    .select('project_id')
    .eq('id', issueId)
    .single()

  if (!issue) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Delete all attachments from storage first
  const { data: attachments } = await supabase
    .from('issue_attachments')
    .select('file_path')
    .eq('issue_id', issueId)

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
    .eq('id', issueId)

  if (error) {
    console.error('Error deleting issue:', error)
    throw new Error('Kunde inte radera avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${issue.project_id}/issues`)
}

// Issue Comments
export async function getIssueComments(issueId: string): Promise<IssueComment[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('issue_comments')
      .select(`
        *,
        author:profiles!issue_comments_author_id_fkey(*)
      `)
      .eq('issue_id', issueId)
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
      issue_id: issueId,
      content,
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
      const { userIds, groupIds } = parseMentionsWithGroups(content, mentionData.members, mentionData.groups)

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
      const mentionedUserIds = parseMentions(content, mentionData.members)
      mentionedUserIds.forEach(id => allMentionedUserIds.add(id))
    }

    // Create notification for each mentioned user (except self)
    for (const mentionedUserId of allMentionedUserIds) {
      if (mentionedUserId !== user.id) {
        await createIssueMentionNotification(
          mentionedUserId,
          authorProfile?.full_name || 'Någon',
          mentionData.projectId,
          issueId,
          mentionData.issueTitle,
          content
        )
      }
    }
  }

  return comment
}

export async function deleteIssueComment(commentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('issue_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Error deleting comment:', error)
    throw new Error('Kunde inte radera kommentaren')
  }
}

// Issue Attachments
export async function getIssueAttachments(issueId: string): Promise<IssueAttachment[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('issue_attachments')
      .select(`
        *,
        uploader:profiles!issue_attachments_uploaded_by_fkey(*)
      `)
      .eq('issue_id', issueId)
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
  file: File
): Promise<IssueAttachment> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the issue to get project_id for file path
  const { data: issue } = await supabase
    .from('issues')
    .select('project_id')
    .eq('id', issueId)
    .single()

  if (!issue) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Upload file to storage
  const uploadResult = await uploadFile('issue-attachments', issue.project_id, file, issueId)

  // Create attachment record
  const { data: attachment, error } = await supabase
    .from('issue_attachments')
    .insert({
      issue_id: issueId,
      file_path: uploadResult.path,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get attachment info
  const { data: attachment } = await supabase
    .from('issue_attachments')
    .select('file_path')
    .eq('id', attachmentId)
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
    .eq('id', attachmentId)

  if (error) {
    console.error('Error deleting attachment:', error)
    throw new Error('Kunde inte radera bilagan')
  }
}

export async function getAttachmentDownloadUrl(attachmentId: string): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: attachment } = await supabase
    .from('issue_attachments')
    .select('file_path')
    .eq('id', attachmentId)
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
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 }
    }

    const { data, error } = await supabase
      .from('issues')
      .select('status')
      .eq('project_id', projectId)

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
