'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Rfi,
  RfiWithDetails,
  RfiAttachment,
  CreateRfiData,
  UpdateRfiData,
  RfiStatus,
  RfiPriority
} from '@/types/database'
import { uploadFile, deleteFile, getSignedUrl } from './storage'

export async function getProjectRfis(
  projectId: string,
  filters?: {
    status?: RfiStatus | 'all'
    priority?: RfiPriority | 'all'
    assignedTo?: string
  }
): Promise<RfiWithDetails[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectRfis: User not authenticated')
      return []
    }

    let query = supabase
      .from('rfis')
      .select(`
        *,
        requester:profiles!rfis_requested_by_fkey(*),
        assignee:profiles!rfis_assigned_to_fkey(*),
        answerer:profiles!rfis_answered_by_fkey(*)
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
      console.error('Error fetching RFIs:', error)
      return []
    }

    return data as RfiWithDetails[]
  } catch (err) {
    console.error('getProjectRfis unexpected error:', err)
    return []
  }
}

export async function getRfi(rfiId: string): Promise<RfiWithDetails | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getRfi: User not authenticated')
      return null
    }

    const { data, error } = await supabase
      .from('rfis')
      .select(`
        *,
        requester:profiles!rfis_requested_by_fkey(*),
        assignee:profiles!rfis_assigned_to_fkey(*),
        answerer:profiles!rfis_answered_by_fkey(*)
      `)
      .eq('id', rfiId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching RFI:', error)
      return null
    }

    return data as RfiWithDetails
  } catch (err) {
    console.error('getRfi unexpected error:', err)
    return null
  }
}

export async function createRfi(
  projectId: string,
  data: CreateRfiData
): Promise<Rfi> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: rfi, error } = await supabase
    .from('rfis')
    .insert({
      project_id: projectId,
      subject: data.subject,
      question: data.question,
      status: data.status || 'open',
      priority: data.priority || 'medium',
      category: data.category || null,
      assigned_to: data.assigned_to || null,
      due_date: data.due_date || null,
      related_drawing_id: data.related_drawing_id || null,
      related_document_id: data.related_document_id || null,
      requested_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating RFI:', error)
    throw new Error('Kunde inte skapa frågan')
  }

  revalidatePath(`/dashboard/projects/${projectId}/rfi`)
  return rfi
}

export async function updateRfi(
  rfiId: string,
  data: UpdateRfiData
): Promise<Rfi> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing RFI
  const { data: existing } = await supabase
    .from('rfis')
    .select('project_id, status')
    .eq('id', rfiId)
    .single()

  if (!existing) {
    throw new Error('Frågan hittades inte')
  }

  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const { data: rfi, error } = await supabase
    .from('rfis')
    .update(updateData)
    .eq('id', rfiId)
    .select()
    .single()

  if (error) {
    console.error('Error updating RFI:', error)
    throw new Error('Kunde inte uppdatera frågan')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/rfi`)
  return rfi
}

export async function answerRfi(
  rfiId: string,
  answer: string
): Promise<Rfi> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing RFI
  const { data: existing } = await supabase
    .from('rfis')
    .select('project_id')
    .eq('id', rfiId)
    .single()

  if (!existing) {
    throw new Error('Frågan hittades inte')
  }

  const { data: rfi, error } = await supabase
    .from('rfis')
    .update({
      answer,
      status: 'answered',
      answered_by: user.id,
      answered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rfiId)
    .select()
    .single()

  if (error) {
    console.error('Error answering RFI:', error)
    throw new Error('Kunde inte svara på frågan')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/rfi`)
  return rfi
}

export async function closeRfi(rfiId: string): Promise<Rfi> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing RFI
  const { data: existing } = await supabase
    .from('rfis')
    .select('project_id')
    .eq('id', rfiId)
    .single()

  if (!existing) {
    throw new Error('Frågan hittades inte')
  }

  const { data: rfi, error } = await supabase
    .from('rfis')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rfiId)
    .select()
    .single()

  if (error) {
    console.error('Error closing RFI:', error)
    throw new Error('Kunde inte stänga frågan')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/rfi`)
  return rfi
}

export async function deleteRfi(rfiId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get RFI info first
  const { data: rfi } = await supabase
    .from('rfis')
    .select('project_id')
    .eq('id', rfiId)
    .single()

  if (!rfi) {
    throw new Error('Frågan hittades inte')
  }

  // Delete all attachments from storage first
  const { data: attachments } = await supabase
    .from('rfi_attachments')
    .select('file_path')
    .eq('rfi_id', rfiId)

  if (attachments) {
    for (const attachment of attachments) {
      try {
        await deleteFile('rfi-attachments', attachment.file_path)
      } catch {
        console.error('Warning: Could not delete attachment from storage')
      }
    }
  }

  // Delete the RFI (cascade will delete attachments)
  const { error } = await supabase
    .from('rfis')
    .delete()
    .eq('id', rfiId)

  if (error) {
    console.error('Error deleting RFI:', error)
    throw new Error('Kunde inte radera frågan')
  }

  revalidatePath(`/dashboard/projects/${rfi.project_id}/rfi`)
}

// RFI Attachments
export async function getRfiAttachments(rfiId: string): Promise<RfiAttachment[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('rfi_attachments')
      .select(`
        *,
        uploader:profiles!rfi_attachments_uploaded_by_fkey(*)
      `)
      .eq('rfi_id', rfiId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching RFI attachments:', error)
      return []
    }

    return data
  } catch (err) {
    console.error('getRfiAttachments unexpected error:', err)
    return []
  }
}

export async function addRfiAttachment(
  rfiId: string,
  file: File
): Promise<RfiAttachment> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the RFI to get project_id for file path
  const { data: rfi } = await supabase
    .from('rfis')
    .select('project_id')
    .eq('id', rfiId)
    .single()

  if (!rfi) {
    throw new Error('Frågan hittades inte')
  }

  // Upload file to storage
  const uploadResult = await uploadFile('rfi-attachments', rfi.project_id, file, rfiId)

  // Create attachment record
  const { data: attachment, error } = await supabase
    .from('rfi_attachments')
    .insert({
      rfi_id: rfiId,
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
      await deleteFile('rfi-attachments', uploadResult.path)
    } catch {
      // Ignore cleanup errors
    }
    console.error('Error creating attachment:', error)
    throw new Error('Kunde inte ladda upp bilagan')
  }

  return attachment
}

export async function deleteRfiAttachment(attachmentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get attachment info
  const { data: attachment } = await supabase
    .from('rfi_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single()

  if (!attachment) {
    throw new Error('Bilagan hittades inte')
  }

  // Delete from storage
  try {
    await deleteFile('rfi-attachments', attachment.file_path)
  } catch {
    console.error('Warning: Could not delete file from storage')
  }

  // Delete from database
  const { error } = await supabase
    .from('rfi_attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) {
    console.error('Error deleting attachment:', error)
    throw new Error('Kunde inte radera bilagan')
  }
}

export async function getRfiAttachmentDownloadUrl(attachmentId: string): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: attachment } = await supabase
    .from('rfi_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single()

  if (!attachment) {
    throw new Error('Bilagan hittades inte')
  }

  return getSignedUrl('rfi-attachments', attachment.file_path, 3600)
}

// Stats
export async function getRfiStats(projectId: string): Promise<{
  total: number
  open: number
  pending: number
  answered: number
  closed: number
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { total: 0, open: 0, pending: 0, answered: 0, closed: 0 }
    }

    const { data, error } = await supabase
      .from('rfis')
      .select('status')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching RFI stats:', error)
      return { total: 0, open: 0, pending: 0, answered: 0, closed: 0 }
    }

    const stats = {
      total: data?.length || 0,
      open: data?.filter(r => r.status === 'open').length || 0,
      pending: data?.filter(r => r.status === 'pending').length || 0,
      answered: data?.filter(r => r.status === 'answered').length || 0,
      closed: data?.filter(r => r.status === 'closed').length || 0,
    }

    return stats
  } catch (err) {
    console.error('getRfiStats unexpected error:', err)
    return { total: 0, open: 0, pending: 0, answered: 0, closed: 0 }
  }
}

// Categories
export async function getRfiCategories(projectId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('rfis')
      .select('category')
      .eq('project_id', projectId)
      .not('category', 'is', null)

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    // Get unique categories
    const categories = new Set(data?.map(r => r.category).filter(Boolean) as string[])
    return Array.from(categories).sort()
  } catch (err) {
    console.error('getRfiCategories unexpected error:', err)
    return []
  }
}
