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
import { uploadFile, deleteFile, getSignedUrl } from './storage'
import { createDeviationMentionNotification } from './notifications'
import { parseMentions } from '@/lib/utils/mentions'

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
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectDeviations: User not authenticated')
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
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.severity && filters.severity !== 'all') {
      query = query.eq('severity', filters.severity)
    }
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
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
      .eq('id', deviationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching deviation:', error)
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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: deviation, error } = await supabase
    .from('deviations')
    .insert({
      project_id: projectId,
      title: data.title,
      description: data.description || null,
      category: data.category,
      severity: data.severity || 'minor',
      status: 'open',
      location: data.location || null,
      drawing_reference: data.drawing_reference || null,
      assigned_to: data.assigned_to || null,
      due_date: data.due_date || null,
      reported_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating deviation:', error)
    throw new Error('Kunde inte skapa avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${projectId}/deviations`)
  return deviation
}

export async function updateDeviation(
  deviationId: string,
  data: UpdateDeviationData
): Promise<Deviation> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing deviation
  const { data: existing } = await supabase
    .from('deviations')
    .select('project_id, status')
    .eq('id', deviationId)
    .single()

  if (!existing) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Build update data with status-specific timestamps
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  // Handle status transitions and set appropriate timestamps
  if (data.status && data.status !== existing.status) {
    const now = new Date().toISOString()

    // Set corrected_at when moving to corrected
    if (data.status === 'corrected') {
      updateData.corrected_at = now
      updateData.corrected_by = user.id
    }
    // Set verified_at when moving to verified
    else if (data.status === 'verified') {
      updateData.verified_at = now
      updateData.verified_by = user.id
    }
    // Set closed_at when moving to closed
    else if (data.status === 'closed') {
      updateData.closed_at = now
    }

    // Clear timestamps if moving backwards
    if (['open', 'investigating', 'action_required'].includes(data.status)) {
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
    .eq('id', deviationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating deviation:', error)
    throw new Error('Kunde inte uppdatera avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/deviations`)
  return deviation
}

export async function deleteDeviation(deviationId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get deviation info first
  const { data: deviation } = await supabase
    .from('deviations')
    .select('project_id')
    .eq('id', deviationId)
    .single()

  if (!deviation) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Delete all attachments from storage first
  const { data: attachments } = await supabase
    .from('deviation_attachments')
    .select('file_path')
    .eq('deviation_id', deviationId)

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
    .eq('id', deviationId)

  if (error) {
    console.error('Error deleting deviation:', error)
    throw new Error('Kunde inte radera avvikelsen')
  }

  revalidatePath(`/dashboard/projects/${deviation.project_id}/deviations`)
}

// Deviation Comments
export async function getDeviationComments(deviationId: string): Promise<DeviationComment[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('deviation_comments')
      .select(`
        *,
        author:profiles!deviation_comments_author_id_fkey(*)
      `)
      .eq('deviation_id', deviationId)
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
    members: { user_id: string; full_name: string }[]
    deviationNumber: number
    deviationTitle: string
    projectId: string
  }
): Promise<DeviationComment> {
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
      deviation_id: deviationId,
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
    const mentionedUserIds = parseMentions(content, mentionData.members)

    // Create notification for each mentioned user (except self)
    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId !== user.id) {
        await createDeviationMentionNotification(
          mentionedUserId,
          authorProfile?.full_name || 'Någon',
          mentionData.projectId,
          deviationId,
          mentionData.deviationNumber,
          mentionData.deviationTitle,
          content
        )
      }
    }
  }

  return comment
}

export async function deleteDeviationComment(commentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('deviation_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Error deleting comment:', error)
    throw new Error('Kunde inte radera kommentaren')
  }
}

// Deviation Attachments
export async function getDeviationAttachments(deviationId: string): Promise<DeviationAttachment[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('deviation_attachments')
      .select(`
        *,
        uploader:profiles!deviation_attachments_uploaded_by_fkey(*)
      `)
      .eq('deviation_id', deviationId)
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
  file: File
): Promise<DeviationAttachment> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the deviation to get project_id for file path
  const { data: deviation } = await supabase
    .from('deviations')
    .select('project_id')
    .eq('id', deviationId)
    .single()

  if (!deviation) {
    throw new Error('Avvikelsen hittades inte')
  }

  // Upload file to storage
  const uploadResult = await uploadFile('deviation-attachments', deviation.project_id, file, deviationId)

  // Create attachment record
  const { data: attachment, error } = await supabase
    .from('deviation_attachments')
    .insert({
      deviation_id: deviationId,
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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get attachment info
  const { data: attachment } = await supabase
    .from('deviation_attachments')
    .select('file_path')
    .eq('id', attachmentId)
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
    .eq('id', attachmentId)

  if (error) {
    console.error('Error deleting attachment:', error)
    throw new Error('Kunde inte radera bilagan')
  }
}

export async function getDeviationAttachmentUrl(attachmentId: string): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: attachment } = await supabase
    .from('deviation_attachments')
    .select('file_path')
    .eq('id', attachmentId)
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
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        total: 0, open: 0, investigating: 0, actionRequired: 0,
        corrected: 0, verified: 0, closed: 0,
        bySeverity: { minor: 0, major: 0, critical: 0 }
      }
    }

    const { data, error } = await supabase
      .from('deviations')
      .select('status, severity')
      .eq('project_id', projectId)

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
