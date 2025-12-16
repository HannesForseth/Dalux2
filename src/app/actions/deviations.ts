'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Deviation,
  DeviationWithDetails,
  DeviationComment,
  DeviationAttachment,
  CreateDeviationData,
  UpdateDeviationData,
  DeviationStatus,
  DeviationSeverity,
  DeviationCategory
} from '@/types/database'
import { uploadFileFromFormData, deleteFile, getSignedUrl } from './storage'
import { createDeviationMentionNotification } from './notifications'
import { parseMentions, parseMentionsWithGroups } from '@/lib/utils/mentions'
import { verifyProjectMembership } from '@/lib/auth-helpers'
import {
  uuidSchema,
  createDeviationSchema,
  updateDeviationSchema,
  createCommentSchema,
  validateInput
} from '@/lib/validations'
import { z } from 'zod'

// Local validation schemas
const deviationFiltersSchema = z.object({
  status: z.enum(['open', 'investigating', 'action_required', 'corrected', 'verified', 'closed', 'all']).optional(),
  severity: z.enum(['minor', 'major', 'critical', 'all']).optional(),
  category: z.enum(['safety', 'quality', 'environment', 'documentation', 'schedule', 'cost', 'other', 'all']).optional(),
  assignedTo: uuidSchema.optional(),
}).optional()

const addDeviationCommentSchema = z.object({
  deviationId: uuidSchema,
  content: z.string().min(1, 'Kommentar krävs').max(5000, 'Kommentaren är för lång'),
})

const statusChangeCommentSchema = z.string().max(1000, 'Kommentaren är för lång').optional()

export async function getProjectDeviations(
  projectId: string,
  filters?: {
    status?: DeviationStatus | 'all'
    severity?: DeviationSeverity | 'all'
    category?: DeviationCategory | 'all'
    assignedTo?: string
  }
): Promise<DeviationWithDetails[]> {
  try {
    // Validate input
    const validatedProjectId = validateInput(uuidSchema, projectId)
    const validatedFilters = validateInput(deviationFiltersSchema, filters)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectDeviations: User not authenticated')
      return []
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedProjectId, user.id)
    if (!hasAccess) {
      console.error('getProjectDeviations: User not a member of project')
      return []
    }

    let query = supabase
      .from('deviations')
      .select(`
        *,
        reporter:profiles!deviations_reported_by_fkey(*),
        assignee:profiles!deviations_assigned_to_fkey(*),
        corrector:profiles!deviations_corrected_by_fkey(*),
        verifier:profiles!deviations_verified_by_fkey(*)
      `)
      .eq('project_id', validatedProjectId)
      .order('created_at', { ascending: false })

    if (validatedFilters?.status && validatedFilters.status !== 'all') {
      query = query.eq('status', validatedFilters.status)
    }
    if (validatedFilters?.severity && validatedFilters.severity !== 'all') {
      query = query.eq('severity', validatedFilters.severity)
    }
    if (validatedFilters?.category && validatedFilters.category !== 'all') {
      query = query.eq('category', validatedFilters.category)
    }
    if (validatedFilters?.assignedTo) {
      query = query.eq('assigned_to', validatedFilters.assignedTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching deviations:', error)
      return []
    }

    return data as DeviationWithDetails[]
  } catch (err) {
    console.error('getProjectDeviations unexpected error:', err)
    return []
  }
}

export async function getDeviation(deviationId: string): Promise<DeviationWithDetails | null> {
  try {
    // Validate input
    const validatedDeviationId = validateInput(uuidSchema, deviationId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getDeviation: User not authenticated')
      return null
    }

    const { data, error } = await supabase
      .from('deviations')
      .select(`
        *,
        reporter:profiles!deviations_reported_by_fkey(*),
        assignee:profiles!deviations_assigned_to_fkey(*),
        corrector:profiles!deviations_corrected_by_fkey(*),
        verifier:profiles!deviations_verified_by_fkey(*)
      `)
      .eq('id', validatedDeviationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching deviation:', error)
      return null
    }

    // Verify user has access to the deviation's project
    const hasAccess = await verifyProjectMembership(data.project_id, user.id)
    if (!hasAccess) {
      console.error('getDeviation: User not a member of project')
      return null
    }

    return data as DeviationWithDetails
  } catch (err) {
    console.error('getDeviation unexpected error:', err)
    return null
  }
}

export async function createDeviation(
  projectId: string,
  data: CreateDeviationData
): Promise<Deviation> {
  // Validate input
  const validatedProjectId = validateInput(uuidSchema, projectId)
  const validatedData = validateInput(createDeviationSchema.omit({ project_id: true }), data)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: deviation, error } = await supabase
    .from('deviations')
    .insert({
      project_id: validatedProjectId,
      title: validatedData.title,
      description: validatedData.description || null,
      category: validatedData.category,
      severity: validatedData.severity || 'minor',
      status: 'open',
      location: validatedData.location || null,
      drawing_reference: (data as { drawing_reference?: string }).drawing_reference || null,
      assigned_to: validatedData.assigned_to || null,
      due_date: validatedData.due_date || null,
      reported_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating deviation:', error)
    throw new Error('Kunde inte skapa avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${validatedProjectId}/deviations`)
  return deviation
}

export async function updateDeviation(
  deviationId: string,
  data: UpdateDeviationData,
  statusChangeComment?: string
): Promise<Deviation> {
  // Validate input
  const validatedDeviationId = validateInput(uuidSchema, deviationId)
  const validatedData = validateInput(updateDeviationSchema, data)
  const validatedComment = validateInput(statusChangeCommentSchema, statusChangeComment)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing deviation
  const { data: existing } = await supabase
    .from('deviations')
    .select('project_id, status')
    .eq('id', validatedDeviationId)
    .single()

  if (!existing) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Build update data with status-specific timestamps
  const updateData: Record<string, unknown> = {
    ...validatedData,
    updated_at: new Date().toISOString(),
  }

  // Track if status is changing for audit trail
  const statusChanged = validatedData.status && validatedData.status !== existing.status

  // Handle status transitions and set appropriate timestamps
  if (statusChanged) {
    const now = new Date().toISOString()

    // Set corrected_at when moving to corrected
    if (validatedData.status === 'corrected') {
      updateData.corrected_at = now
      updateData.corrected_by = user.id
    }
    // Set verified_at when moving to verified
    else if (validatedData.status === 'verified') {
      updateData.verified_at = now
      updateData.verified_by = user.id
    }
    // Set closed_at when moving to closed
    else if (validatedData.status === 'closed') {
      updateData.closed_at = now
    }

    // Clear timestamps if moving backwards
    if (['open', 'investigating', 'action_required'].includes(validatedData.status!)) {
      updateData.corrected_at = null
      updateData.corrected_by = null
      updateData.verified_at = null
      updateData.verified_by = null
      updateData.closed_at = null
    }
  }

  const { data: deviation, error } = await supabase
    .from('deviations')
    .update(updateData)
    .eq('id', validatedDeviationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating deviation:', error)
    throw new Error('Kunde inte uppdatera avvikelsen')
  }

  // Log status change to audit trail
  if (statusChanged && validatedData.status) {
    const { error: historyError } = await supabase
      .from('status_history')
      .insert({
        entity_type: 'deviation',
        entity_id: validatedDeviationId,
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

  revalidatePath(`/dashboard/projects/${existing.project_id}/deviations`)
  return deviation
}

export async function deleteDeviation(deviationId: string): Promise<void> {
  // Validate input
  const validatedDeviationId = validateInput(uuidSchema, deviationId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get deviation info first
  const { data: deviation } = await supabase
    .from('deviations')
    .select('project_id')
    .eq('id', validatedDeviationId)
    .single()

  if (!deviation) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Delete all attachments from storage first
  const { data: attachments } = await supabase
    .from('deviation_attachments')
    .select('file_path')
    .eq('deviation_id', validatedDeviationId)

  if (attachments) {
    for (const attachment of attachments) {
      try {
        await deleteFile('deviation-attachments', attachment.file_path)
      } catch {
        console.error('Warning: Could not delete attachment from storage')
      }
    }
  }

  // Delete the deviation (cascade will delete comments and attachments)
  const { error } = await supabase
    .from('deviations')
    .delete()
    .eq('id', validatedDeviationId)

  if (error) {
    console.error('Error deleting deviation:', error)
    throw new Error('Kunde inte radera avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${deviation.project_id}/deviations`)
}

// Deviation Comments
export async function getDeviationComments(deviationId: string): Promise<DeviationComment[]> {
  try {
    // Validate input
    const validatedDeviationId = validateInput(uuidSchema, deviationId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    // Get deviation to find project_id
    const { data: deviation } = await supabase
      .from('deviations')
      .select('project_id')
      .eq('id', validatedDeviationId)
      .single()

    if (!deviation) return []

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(deviation.project_id, user.id)
    if (!hasAccess) {
      console.error('getDeviationComments: User not a member of project')
      return []
    }

    const { data, error } = await supabase
      .from('deviation_comments')
      .select(`
        *,
        author:profiles!deviation_comments_author_id_fkey(*)
      `)
      .eq('deviation_id', validatedDeviationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching deviation comments:', error)
      return []
    }

    return data
  } catch (err) {
    console.error('getDeviationComments unexpected error:', err)
    return []
  }
}

export async function addDeviationComment(
  deviationId: string,
  content: string,
  mentionData?: {
    members: { user_id: string; full_name: string; email?: string }[]
    groups?: { id: string; name: string }[]
    deviationNumber: number
    deviationTitle: string
    projectId: string
  }
): Promise<DeviationComment> {
  // Validate input
  const validated = validateInput(addDeviationCommentSchema, { deviationId, content })

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
    .from('deviation_comments')
    .insert({
      deviation_id: validated.deviationId,
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
    // Collect all user IDs to notify (from individual mentions + group expansion)
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
        await createDeviationMentionNotification(
          mentionedUserId,
          authorProfile?.full_name || 'Någon',
          mentionData.projectId,
          validated.deviationId,
          mentionData.deviationNumber,
          mentionData.deviationTitle,
          validated.content
        )
      }
    }
  }

  return comment
}

export async function deleteDeviationComment(commentId: string): Promise<void> {
  // Validate input
  const validatedCommentId = validateInput(uuidSchema, commentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('deviation_comments')
    .delete()
    .eq('id', validatedCommentId)

  if (error) {
    console.error('Error deleting comment:', error)
    throw new Error('Kunde inte radera kommentaren')
  }
}

// Deviation Attachments
export async function getDeviationAttachments(deviationId: string): Promise<DeviationAttachment[]> {
  try {
    // Validate input
    const validatedDeviationId = validateInput(uuidSchema, deviationId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    // Get deviation to find project_id
    const { data: deviation } = await supabase
      .from('deviations')
      .select('project_id')
      .eq('id', validatedDeviationId)
      .single()

    if (!deviation) return []

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(deviation.project_id, user.id)
    if (!hasAccess) {
      console.error('getDeviationAttachments: User not a member of project')
      return []
    }

    const { data, error } = await supabase
      .from('deviation_attachments')
      .select(`
        *,
        uploader:profiles!deviation_attachments_uploaded_by_fkey(*)
      `)
      .eq('deviation_id', validatedDeviationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching deviation attachments:', error)
      return []
    }

    return data
  } catch (err) {
    console.error('getDeviationAttachments unexpected error:', err)
    return []
  }
}

export async function addDeviationAttachment(
  deviationId: string,
  formData: FormData
): Promise<DeviationAttachment> {
  // Validate input
  const validatedDeviationId = validateInput(uuidSchema, deviationId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the deviation to get project_id for file path
  const { data: deviation } = await supabase
    .from('deviations')
    .select('project_id')
    .eq('id', validatedDeviationId)
    .single()

  if (!deviation) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Upload file to storage using FormData
  const uploadResult = await uploadFileFromFormData('deviation-attachments', deviation.project_id, formData, validatedDeviationId)

  // Create attachment record
  const { data: attachment, error } = await supabase
    .from('deviation_attachments')
    .insert({
      deviation_id: validatedDeviationId,
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
      await deleteFile('deviation-attachments', uploadResult.path)
    } catch {
      // Ignore cleanup errors
    }
    console.error('Error creating attachment:', error)
    throw new Error('Kunde inte ladda upp bilagan')
  }

  return attachment
}

export async function deleteDeviationAttachment(attachmentId: string): Promise<void> {
  // Validate input
  const validatedAttachmentId = validateInput(uuidSchema, attachmentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get attachment info
  const { data: attachment } = await supabase
    .from('deviation_attachments')
    .select('file_path')
    .eq('id', validatedAttachmentId)
    .single()

  if (!attachment) {
    throw new Error('Bilagan hittades inte')
  }

  // Delete from storage
  try {
    await deleteFile('deviation-attachments', attachment.file_path)
  } catch {
    console.error('Warning: Could not delete file from storage')
  }

  // Delete from database
  const { error } = await supabase
    .from('deviation_attachments')
    .delete()
    .eq('id', validatedAttachmentId)

  if (error) {
    console.error('Error deleting attachment:', error)
    throw new Error('Kunde inte radera bilagan')
  }
}

export async function getDeviationAttachmentUrl(attachmentId: string): Promise<string> {
  // Validate input
  const validatedAttachmentId = validateInput(uuidSchema, attachmentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: attachment } = await supabase
    .from('deviation_attachments')
    .select('file_path')
    .eq('id', validatedAttachmentId)
    .single()

  if (!attachment) {
    throw new Error('Bilagan hittades inte')
  }

  return getSignedUrl('deviation-attachments', attachment.file_path, 3600)
}

// Stats
export async function getDeviationStats(projectId: string): Promise<{
  total: number
  open: number
  investigating: number
  actionRequired: number
  corrected: number
  verified: number
  closed: number
  bySeverity: {
    minor: number
    major: number
    critical: number
  }
}> {
  try {
    // Validate input
    const validatedProjectId = validateInput(uuidSchema, projectId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        total: 0, open: 0, investigating: 0, actionRequired: 0,
        corrected: 0, verified: 0, closed: 0,
        bySeverity: { minor: 0, major: 0, critical: 0 }
      }
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedProjectId, user.id)
    if (!hasAccess) {
      console.error('getDeviationStats: User not a member of project')
      return {
        total: 0, open: 0, investigating: 0, actionRequired: 0,
        corrected: 0, verified: 0, closed: 0,
        bySeverity: { minor: 0, major: 0, critical: 0 }
      }
    }

    const { data, error } = await supabase
      .from('deviations')
      .select('status, severity')
      .eq('project_id', validatedProjectId)

    if (error) {
      console.error('Error fetching deviation stats:', error)
      return {
        total: 0, open: 0, investigating: 0, actionRequired: 0,
        corrected: 0, verified: 0, closed: 0,
        bySeverity: { minor: 0, major: 0, critical: 0 }
      }
    }

    const stats = {
      total: data?.length || 0,
      open: data?.filter(d => d.status === 'open').length || 0,
      investigating: data?.filter(d => d.status === 'investigating').length || 0,
      actionRequired: data?.filter(d => d.status === 'action_required').length || 0,
      corrected: data?.filter(d => d.status === 'corrected').length || 0,
      verified: data?.filter(d => d.status === 'verified').length || 0,
      closed: data?.filter(d => d.status === 'closed').length || 0,
      bySeverity: {
        minor: data?.filter(d => d.severity === 'minor').length || 0,
        major: data?.filter(d => d.severity === 'major').length || 0,
        critical: data?.filter(d => d.severity === 'critical').length || 0,
      }
    }

    return stats
  } catch (err) {
    console.error('getDeviationStats unexpected error:', err)
    return {
      total: 0, open: 0, investigating: 0, actionRequired: 0,
      corrected: 0, verified: 0, closed: 0,
      bySeverity: { minor: 0, major: 0, critical: 0 }
    }
  }
}
