'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Protocol,
  ProtocolWithDetails,
  ProtocolWithCreator,
  ProtocolAttendee,
  ProtocolAgendaItem,
  ProtocolDecision,
  ProtocolActionItem,
  ProtocolAttachment,
  ProtocolLink,
  CreateProtocolData,
  UpdateProtocolData,
  CreateProtocolAttendeeData,
  CreateProtocolAgendaItemData,
  UpdateProtocolAgendaItemData,
  CreateProtocolDecisionData,
  CreateProtocolActionItemData,
  UpdateProtocolActionItemData,
  CreateProtocolLinkData,
  ProtocolStatus,
  ProtocolMeetingType,
  ProtocolActionItemStatus
} from '@/types/database'
import { uploadFile, deleteFile, getSignedUrl } from './storage'

// ============================================
// Protocol CRUD
// ============================================

export async function getProjectProtocols(
  projectId: string,
  filters?: {
    status?: ProtocolStatus | 'all'
    meeting_type?: ProtocolMeetingType | 'all'
  }
): Promise<ProtocolWithCreator[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectProtocols: User not authenticated')
      return []
    }

    let query = supabase
      .from('protocols')
      .select(`
        *,
        creator:profiles!protocols_created_by_fkey(*)
      `)
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.meeting_type && filters.meeting_type !== 'all') {
      query = query.eq('meeting_type', filters.meeting_type)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching protocols:', error)
      return []
    }

    return data as ProtocolWithCreator[]
  } catch (err) {
    console.error('getProjectProtocols unexpected error:', err)
    return []
  }
}

export async function getProtocol(protocolId: string): Promise<ProtocolWithDetails | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProtocol: User not authenticated')
      return null
    }

    // Get protocol with basic relations
    const { data: protocol, error: protocolError } = await supabase
      .from('protocols')
      .select(`
        *,
        creator:profiles!protocols_created_by_fkey(*),
        previous_protocol:protocols!protocols_previous_protocol_id_fkey(id, protocol_number, title)
      `)
      .eq('id', protocolId)
      .single()

    if (protocolError) {
      if (protocolError.code === 'PGRST116') return null
      console.error('Error fetching protocol:', protocolError)
      return null
    }

    // Get attendees
    const { data: attendees } = await supabase
      .from('protocol_attendees')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('protocol_id', protocolId)
      .order('created_at', { ascending: true })

    // Get agenda items
    const { data: agendaItems } = await supabase
      .from('protocol_agenda_items')
      .select(`
        *,
        presenter:profiles(*)
      `)
      .eq('protocol_id', protocolId)
      .order('order_index', { ascending: true })

    // Get decisions
    const { data: decisions } = await supabase
      .from('protocol_decisions')
      .select('*')
      .eq('protocol_id', protocolId)
      .order('decision_number', { ascending: true })

    // Get action items
    const { data: actionItems } = await supabase
      .from('protocol_action_items')
      .select(`
        *,
        assignee:profiles(*)
      `)
      .eq('protocol_id', protocolId)
      .order('action_number', { ascending: true })

    // Get attachments
    const { data: attachments } = await supabase
      .from('protocol_attachments')
      .select(`
        *,
        uploader:profiles(*)
      `)
      .eq('protocol_id', protocolId)
      .order('created_at', { ascending: false })

    // Get links
    const { data: links } = await supabase
      .from('protocol_links')
      .select('*')
      .eq('protocol_id', protocolId)
      .order('created_at', { ascending: false })

    return {
      ...protocol,
      attendees: attendees || [],
      agenda_items: agendaItems || [],
      decisions: decisions || [],
      action_items: actionItems || [],
      attachments: attachments || [],
      links: links || []
    } as ProtocolWithDetails
  } catch (err) {
    console.error('getProtocol unexpected error:', err)
    return null
  }
}

export async function createProtocol(
  projectId: string,
  data: CreateProtocolData
): Promise<Protocol> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: protocol, error } = await supabase
    .from('protocols')
    .insert({
      project_id: projectId,
      title: data.title,
      meeting_type: data.meeting_type,
      meeting_date: data.meeting_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      location: data.location || null,
      previous_protocol_id: data.previous_protocol_id || null,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating protocol:', error)
    throw new Error('Kunde inte skapa protokollet')
  }

  revalidatePath(`/dashboard/projects/${projectId}/protocols`)
  return protocol
}

export async function updateProtocol(
  protocolId: string,
  data: UpdateProtocolData
): Promise<Protocol> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: protocol, error } = await supabase
    .from('protocols')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', protocolId)
    .select()
    .single()

  if (error) {
    console.error('Error updating protocol:', error)
    throw new Error('Kunde inte uppdatera protokollet')
  }

  revalidatePath(`/dashboard/projects/${protocol.project_id}/protocols`)
  return protocol
}

export async function deleteProtocol(protocolId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get protocol to find project_id for revalidation
  const { data: protocol } = await supabase
    .from('protocols')
    .select('project_id')
    .eq('id', protocolId)
    .single()

  const { error } = await supabase
    .from('protocols')
    .delete()
    .eq('id', protocolId)

  if (error) {
    console.error('Error deleting protocol:', error)
    throw new Error('Kunde inte ta bort protokollet')
  }

  if (protocol) {
    revalidatePath(`/dashboard/projects/${protocol.project_id}/protocols`)
  }
}

export async function finalizeProtocol(protocolId: string): Promise<Protocol> {
  return updateProtocol(protocolId, { status: 'finalized' })
}

// ============================================
// Attendees
// ============================================

export async function addAttendee(
  protocolId: string,
  data: CreateProtocolAttendeeData
): Promise<ProtocolAttendee> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: attendee, error } = await supabase
    .from('protocol_attendees')
    .insert({
      protocol_id: protocolId,
      user_id: data.user_id || null,
      name: data.name,
      email: data.email || null,
      company: data.company || null,
      role: data.role || 'attendee',
      attended: data.attended ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding attendee:', error)
    throw new Error('Kunde inte lägga till deltagare')
  }

  return attendee
}

export async function updateAttendee(
  attendeeId: string,
  data: Partial<CreateProtocolAttendeeData>
): Promise<ProtocolAttendee> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: attendee, error } = await supabase
    .from('protocol_attendees')
    .update(data)
    .eq('id', attendeeId)
    .select()
    .single()

  if (error) {
    console.error('Error updating attendee:', error)
    throw new Error('Kunde inte uppdatera deltagare')
  }

  return attendee
}

export async function removeAttendee(attendeeId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('protocol_attendees')
    .delete()
    .eq('id', attendeeId)

  if (error) {
    console.error('Error removing attendee:', error)
    throw new Error('Kunde inte ta bort deltagare')
  }
}

export async function addMultipleAttendees(
  protocolId: string,
  attendees: CreateProtocolAttendeeData[]
): Promise<ProtocolAttendee[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const attendeesToInsert = attendees.map(a => ({
    protocol_id: protocolId,
    user_id: a.user_id || null,
    name: a.name,
    email: a.email || null,
    company: a.company || null,
    role: a.role || 'attendee',
    attended: a.attended ?? true,
  }))

  const { data, error } = await supabase
    .from('protocol_attendees')
    .insert(attendeesToInsert)
    .select()

  if (error) {
    console.error('Error adding attendees:', error)
    throw new Error('Kunde inte lägga till deltagare')
  }

  return data
}

// ============================================
// Agenda Items
// ============================================

export async function addAgendaItem(
  protocolId: string,
  data: CreateProtocolAgendaItemData
): Promise<ProtocolAgendaItem> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: item, error } = await supabase
    .from('protocol_agenda_items')
    .insert({
      protocol_id: protocolId,
      order_index: data.order_index,
      title: data.title,
      description: data.description || null,
      duration_minutes: data.duration_minutes || null,
      presenter_id: data.presenter_id || null,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding agenda item:', error)
    throw new Error('Kunde inte lägga till dagordningspunkt')
  }

  return item
}

export async function updateAgendaItem(
  itemId: string,
  data: UpdateProtocolAgendaItemData
): Promise<ProtocolAgendaItem> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: item, error } = await supabase
    .from('protocol_agenda_items')
    .update(data)
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    console.error('Error updating agenda item:', error)
    throw new Error('Kunde inte uppdatera dagordningspunkt')
  }

  return item
}

export async function deleteAgendaItem(itemId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('protocol_agenda_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting agenda item:', error)
    throw new Error('Kunde inte ta bort dagordningspunkt')
  }
}

export async function reorderAgendaItems(
  items: { id: string; order_index: number }[]
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  for (const item of items) {
    const { error } = await supabase
      .from('protocol_agenda_items')
      .update({ order_index: item.order_index })
      .eq('id', item.id)

    if (error) {
      console.error('Error reordering agenda items:', error)
      throw new Error('Kunde inte ändra ordning på dagordningspunkter')
    }
  }
}

// ============================================
// Decisions
// ============================================

export async function addDecision(
  protocolId: string,
  data: CreateProtocolDecisionData
): Promise<ProtocolDecision> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get next decision number
  const { data: existing } = await supabase
    .from('protocol_decisions')
    .select('decision_number')
    .eq('protocol_id', protocolId)
    .order('decision_number', { ascending: false })
    .limit(1)

  const decisionNumber = existing && existing.length > 0
    ? existing[0].decision_number + 1
    : 1

  const { data: decision, error } = await supabase
    .from('protocol_decisions')
    .insert({
      protocol_id: protocolId,
      decision_number: decisionNumber,
      description: data.description,
      decided_by: data.decided_by || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding decision:', error)
    throw new Error('Kunde inte lägga till beslut')
  }

  return decision
}

export async function deleteDecision(decisionId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('protocol_decisions')
    .delete()
    .eq('id', decisionId)

  if (error) {
    console.error('Error deleting decision:', error)
    throw new Error('Kunde inte ta bort beslut')
  }
}

// ============================================
// Action Items
// ============================================

export async function addActionItem(
  protocolId: string,
  data: CreateProtocolActionItemData
): Promise<ProtocolActionItem> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get next action number
  const { data: existing } = await supabase
    .from('protocol_action_items')
    .select('action_number')
    .eq('protocol_id', protocolId)
    .order('action_number', { ascending: false })
    .limit(1)

  const actionNumber = existing && existing.length > 0
    ? existing[0].action_number + 1
    : 1

  const { data: actionItem, error } = await supabase
    .from('protocol_action_items')
    .insert({
      protocol_id: protocolId,
      action_number: actionNumber,
      description: data.description,
      assigned_to: data.assigned_to || null,
      assigned_to_name: data.assigned_to_name || null,
      deadline: data.deadline || null,
      priority: data.priority || 'medium',
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding action item:', error)
    throw new Error('Kunde inte lägga till åtgärdspunkt')
  }

  return actionItem
}

export async function updateActionItem(
  actionId: string,
  data: UpdateProtocolActionItemData
): Promise<ProtocolActionItem> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString()
  }

  // Set completed_at if status changed to completed
  if (data.status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else if (data.status) {
    // If status is provided but not 'completed', clear completed_at
    updateData.completed_at = null
  }

  const { data: actionItem, error } = await supabase
    .from('protocol_action_items')
    .update(updateData)
    .eq('id', actionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating action item:', error)
    throw new Error('Kunde inte uppdatera åtgärdspunkt')
  }

  return actionItem
}

export async function deleteActionItem(actionId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('protocol_action_items')
    .delete()
    .eq('id', actionId)

  if (error) {
    console.error('Error deleting action item:', error)
    throw new Error('Kunde inte ta bort åtgärdspunkt')
  }
}

export async function bulkAddActionItems(
  protocolId: string,
  actions: CreateProtocolActionItemData[]
): Promise<ProtocolActionItem[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get current max action number
  const { data: existing } = await supabase
    .from('protocol_action_items')
    .select('action_number')
    .eq('protocol_id', protocolId)
    .order('action_number', { ascending: false })
    .limit(1)

  let nextNumber = existing && existing.length > 0
    ? existing[0].action_number + 1
    : 1

  const actionsToInsert = actions.map((action, index) => ({
    protocol_id: protocolId,
    action_number: nextNumber + index,
    description: action.description,
    assigned_to: action.assigned_to || null,
    assigned_to_name: action.assigned_to_name || null,
    deadline: action.deadline || null,
    priority: action.priority || 'medium',
    status: 'pending' as const,
  }))

  const { data, error } = await supabase
    .from('protocol_action_items')
    .insert(actionsToInsert)
    .select()

  if (error) {
    console.error('Error bulk adding action items:', error)
    throw new Error('Kunde inte lägga till åtgärdspunkter')
  }

  return data
}

// Get pending action items for a user across all projects
export async function getUserPendingActionItems(
  userId: string
): Promise<(ProtocolActionItem & { protocol: { protocol_number: number; title: string; project_id: string } })[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('protocol_action_items')
    .select(`
      *,
      protocol:protocols(protocol_number, title, project_id)
    `)
    .eq('assigned_to', userId)
    .in('status', ['pending', 'in_progress'])
    .order('deadline', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching user action items:', error)
    return []
  }

  return data as (ProtocolActionItem & { protocol: { protocol_number: number; title: string; project_id: string } })[]
}

// ============================================
// Links
// ============================================

export async function addLink(
  protocolId: string,
  data: CreateProtocolLinkData
): Promise<ProtocolLink> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: link, error } = await supabase
    .from('protocol_links')
    .insert({
      protocol_id: protocolId,
      link_type: data.link_type,
      linked_item_id: data.linked_item_id,
      link_direction: data.link_direction || 'referenced',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding link:', error)
    throw new Error('Kunde inte lägga till länk')
  }

  return link
}

export async function removeLink(linkId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('protocol_links')
    .delete()
    .eq('id', linkId)

  if (error) {
    console.error('Error removing link:', error)
    throw new Error('Kunde inte ta bort länk')
  }
}

// ============================================
// Attachments
// ============================================

export async function getProtocolAttachments(protocolId: string): Promise<ProtocolAttachment[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('protocol_attachments')
    .select('*')
    .eq('protocol_id', protocolId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching protocol attachments:', error)
    return []
  }

  return data
}

export async function addProtocolAttachment(
  protocolId: string,
  file: File,
  projectId: string
): Promise<ProtocolAttachment> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Upload file to storage
  const uploadResult = await uploadFile(
    'protocol-attachments',
    projectId,
    file,
    `protocols/${protocolId}`
  )
  const filePath = uploadResult.path

  // Create attachment record
  const { data: attachment, error } = await supabase
    .from('protocol_attachments')
    .insert({
      protocol_id: protocolId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Clean up uploaded file if DB insert fails
    await deleteFile('protocol-attachments', filePath)
    console.error('Error creating attachment record:', error)
    throw new Error('Kunde inte spara bilagan')
  }

  return attachment
}

export async function deleteProtocolAttachment(attachmentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get attachment to find file path
  const { data: attachment } = await supabase
    .from('protocol_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single()

  if (attachment) {
    await deleteFile('protocol-attachments', attachment.file_path)
  }

  const { error } = await supabase
    .from('protocol_attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) {
    console.error('Error deleting attachment:', error)
    throw new Error('Kunde inte ta bort bilagan')
  }
}

export async function getProtocolAttachmentUrl(filePath: string): Promise<string> {
  return getSignedUrl('protocol-attachments', filePath)
}

// ============================================
// Statistics
// ============================================

export async function getProjectProtocolStats(projectId: string): Promise<{
  total: number
  draft: number
  finalized: number
  pendingActions: number
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { total: 0, draft: 0, finalized: 0, pendingActions: 0 }
  }

  // Get protocol counts
  const { data: protocols } = await supabase
    .from('protocols')
    .select('id, status')
    .eq('project_id', projectId)

  if (!protocols) {
    return { total: 0, draft: 0, finalized: 0, pendingActions: 0 }
  }

  const protocolIds = protocols.map(p => p.id)

  // Get pending action items count
  const { count: pendingActions } = await supabase
    .from('protocol_action_items')
    .select('*', { count: 'exact', head: true })
    .in('protocol_id', protocolIds)
    .in('status', ['pending', 'in_progress'])

  return {
    total: protocols.length,
    draft: protocols.filter(p => p.status === 'draft').length,
    finalized: protocols.filter(p => p.status === 'finalized').length,
    pendingActions: pendingActions || 0
  }
}
