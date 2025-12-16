'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { verifyProjectMembership } from '@/lib/auth-helpers'
import type {
  ProtocolTemplate,
  ProtocolTemplateWithDetails,
  ProtocolTemplateAgendaItem,
  ProtocolTemplateAttendeeRole,
  ProtocolMeetingType,
  ProtocolAttendeeRole
} from '@/types/database'

/**
 * Get all available templates (system + user's own)
 */
export async function getProtocolTemplates(): Promise<ProtocolTemplate[]> {
  noStore()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('protocol_templates')
    .select(`
      *,
      agenda_items:protocol_template_agenda_items(count),
      attendee_roles:protocol_template_attendee_roles(count)
    `)
    .or(`is_system.eq.true,user_id.eq.${user.id}`)
    .order('is_system', { ascending: false })
    .order('name')

  if (error) {
    console.error('Error fetching templates:', error)
    throw new Error('Kunde inte hämta mallar')
  }

  return data || []
}

/**
 * Get a specific template with all relations
 */
export async function getProtocolTemplate(templateId: string): Promise<ProtocolTemplateWithDetails | null> {
  noStore()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('protocol_templates')
    .select(`
      *,
      agenda_items:protocol_template_agenda_items(*),
      attendee_roles:protocol_template_attendee_roles(*),
      decisions:protocol_template_decisions(*),
      actions:protocol_template_actions(*)
    `)
    .eq('id', templateId)
    .single()

  if (error) {
    console.error('Error fetching template:', error)
    return null
  }

  // Sort agenda items by order_index
  if (data?.agenda_items) {
    data.agenda_items.sort((a: ProtocolTemplateAgendaItem, b: ProtocolTemplateAgendaItem) =>
      a.order_index - b.order_index
    )
  }

  return data as ProtocolTemplateWithDetails
}

/**
 * Save an existing protocol as a new template
 */
export async function saveProtocolAsTemplate(
  protocolId: string,
  name: string,
  description?: string
): Promise<ProtocolTemplate> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Fetch the protocol with all related data
  const { data: protocol, error: protocolError } = await supabase
    .from('protocols')
    .select(`
      *,
      attendees:protocol_attendees(*),
      agenda_items:protocol_agenda_items(*),
      decisions:protocol_decisions(*),
      action_items:protocol_action_items(*)
    `)
    .eq('id', protocolId)
    .single()

  if (protocolError || !protocol) {
    console.error('Error fetching protocol:', protocolError)
    throw new Error('Kunde inte hämta protokoll')
  }

  // Verify user has access to the protocol's project
  const hasAccess = await verifyProjectMembership(protocol.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Create the template
  const { data: template, error: templateError } = await supabase
    .from('protocol_templates')
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      meeting_type: protocol.meeting_type,
      is_system: false,
      default_location: protocol.location,
      default_start_time: protocol.start_time,
      default_end_time: protocol.end_time,
      default_notes: null
    })
    .select()
    .single()

  if (templateError || !template) {
    console.error('Error creating template:', templateError)
    throw new Error('Kunde inte skapa mall')
  }

  // Copy agenda items
  if (protocol.agenda_items && protocol.agenda_items.length > 0) {
    const agendaItems = protocol.agenda_items.map((item: { order_index: number; title: string; description: string | null; duration_minutes: number | null }) => ({
      template_id: template.id,
      order_index: item.order_index,
      title: item.title,
      description: item.description,
      duration_minutes: item.duration_minutes
    }))

    const { error: agendaError } = await supabase
      .from('protocol_template_agenda_items')
      .insert(agendaItems)

    if (agendaError) {
      console.error('Error copying agenda items:', agendaError)
    }
  }

  // Convert attendees to roles (group by company/role)
  if (protocol.attendees && protocol.attendees.length > 0) {
    const roleMap = new Map<string, { role_name: string; company_placeholder: string | null; role: string }>()

    for (const attendee of protocol.attendees) {
      const key = `${attendee.company || 'Okänt'}|${attendee.role}`
      if (!roleMap.has(key)) {
        roleMap.set(key, {
          role_name: attendee.company ? `${attendee.company}` : 'Deltagare',
          company_placeholder: attendee.company,
          role: attendee.role
        })
      }
    }

    const attendeeRoles = Array.from(roleMap.values()).map(role => ({
      template_id: template.id,
      ...role
    }))

    const { error: rolesError } = await supabase
      .from('protocol_template_attendee_roles')
      .insert(attendeeRoles)

    if (rolesError) {
      console.error('Error copying attendee roles:', rolesError)
    }
  }

  // Copy decisions (optional - might not want to carry over specific decisions)
  // Skip for now as decisions are usually specific to meetings

  // Copy action item templates (without specific assignments)
  if (protocol.action_items && protocol.action_items.length > 0) {
    // Only copy recurring/template-worthy actions (not specific tasks)
    const standardActions = protocol.action_items
      .filter((item: { description: string }) =>
        item.description.toLowerCase().includes('standard') ||
        item.description.toLowerCase().includes('rutin') ||
        item.description.toLowerCase().includes('alltid')
      )
      .map((item: { description: string; priority: string }) => ({
        template_id: template.id,
        description: item.description,
        priority: item.priority,
        default_role: null,
        default_days_until_deadline: null
      }))

    if (standardActions.length > 0) {
      const { error: actionsError } = await supabase
        .from('protocol_template_actions')
        .insert(standardActions)

      if (actionsError) {
        console.error('Error copying actions:', actionsError)
      }
    }
  }

  return template
}

/**
 * Create a new custom template
 */
export async function createTemplate(data: {
  name: string
  description?: string
  meeting_type: ProtocolMeetingType
  default_location?: string
  default_start_time?: string
  default_end_time?: string
  agenda_items?: { title: string; description?: string; duration_minutes?: number }[]
  attendee_roles?: { role_name: string; company_placeholder?: string; role?: ProtocolAttendeeRole }[]
}): Promise<ProtocolTemplate> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: template, error } = await supabase
    .from('protocol_templates')
    .insert({
      user_id: user.id,
      name: data.name,
      description: data.description || null,
      meeting_type: data.meeting_type,
      is_system: false,
      default_location: data.default_location || null,
      default_start_time: data.default_start_time || null,
      default_end_time: data.default_end_time || null
    })
    .select()
    .single()

  if (error || !template) {
    console.error('Error creating template:', error)
    throw new Error('Kunde inte skapa mall')
  }

  // Add agenda items
  if (data.agenda_items && data.agenda_items.length > 0) {
    const agendaItems = data.agenda_items.map((item, index) => ({
      template_id: template.id,
      order_index: index + 1,
      title: item.title,
      description: item.description || null,
      duration_minutes: item.duration_minutes || null
    }))

    await supabase
      .from('protocol_template_agenda_items')
      .insert(agendaItems)
  }

  // Add attendee roles
  if (data.attendee_roles && data.attendee_roles.length > 0) {
    const roles = data.attendee_roles.map(role => ({
      template_id: template.id,
      role_name: role.role_name,
      company_placeholder: role.company_placeholder || null,
      role: role.role || 'attendee'
    }))

    await supabase
      .from('protocol_template_attendee_roles')
      .insert(roles)
  }

  return template
}

/**
 * Update a custom template (only own templates, not system)
 */
export async function updateTemplate(
  templateId: string,
  data: {
    name?: string
    description?: string | null
    meeting_type?: ProtocolMeetingType
    default_location?: string | null
    default_start_time?: string | null
    default_end_time?: string | null
  }
): Promise<ProtocolTemplate> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Check ownership
  const { data: existing } = await supabase
    .from('protocol_templates')
    .select('user_id, is_system')
    .eq('id', templateId)
    .single()

  if (!existing || existing.is_system || existing.user_id !== user.id) {
    throw new Error('Kan inte redigera denna mall')
  }

  const { data: template, error } = await supabase
    .from('protocol_templates')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single()

  if (error || !template) {
    console.error('Error updating template:', error)
    throw new Error('Kunde inte uppdatera mall')
  }

  return template
}

/**
 * Delete a custom template (only own templates, not system)
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Check ownership
  const { data: existing } = await supabase
    .from('protocol_templates')
    .select('user_id, is_system')
    .eq('id', templateId)
    .single()

  if (!existing || existing.is_system || existing.user_id !== user.id) {
    throw new Error('Kan inte ta bort denna mall')
  }

  const { error } = await supabase
    .from('protocol_templates')
    .delete()
    .eq('id', templateId)

  if (error) {
    console.error('Error deleting template:', error)
    throw new Error('Kunde inte ta bort mall')
  }
}

/**
 * Apply a template - returns data to pre-fill CreateProtocolModal
 */
export async function applyTemplate(templateId: string): Promise<{
  meeting_type: ProtocolMeetingType
  location: string | null
  start_time: string | null
  end_time: string | null
  agenda_items: { title: string; description: string | null; duration_minutes: number | null }[]
  attendee_roles: { role_name: string; company_placeholder: string | null; role: ProtocolAttendeeRole }[]
}> {
  noStore()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const template = await getProtocolTemplate(templateId)
  if (!template) {
    throw new Error('Mall hittades inte')
  }

  return {
    meeting_type: template.meeting_type,
    location: template.default_location,
    start_time: template.default_start_time,
    end_time: template.default_end_time,
    agenda_items: (template.agenda_items || []).map(item => ({
      title: item.title,
      description: item.description,
      duration_minutes: item.duration_minutes
    })),
    attendee_roles: (template.attendee_roles || []).map(role => ({
      role_name: role.role_name,
      company_placeholder: role.company_placeholder,
      role: role.role
    }))
  }
}
