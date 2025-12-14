'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Calendar event types
export type CalendarEventType =
  | 'meeting'        // From protocols with meeting_date
  | 'issue_deadline' // From issues with due_date
  | 'deviation_deadline' // From deviations with due_date
  | 'action_deadline'    // From protocol_action_items with deadline
  | 'reminder'       // Custom calendar event
  | 'milestone'      // Custom calendar event

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  title: string
  description?: string
  date: string  // ISO date string
  startTime?: string
  endTime?: string
  location?: string
  status?: string
  priority?: string
  severity?: string
  link: string
  color: string
  sourceId?: string  // Original ID from source table
}

export interface CustomCalendarEvent {
  id: string
  project_id: string
  title: string
  description?: string
  event_date: string
  start_time?: string
  end_time?: string
  location?: string
  event_type: 'reminder' | 'meeting' | 'deadline' | 'milestone'
  color: string
  created_by: string
  created_at: string
  updated_at: string
}

// Color mapping for event types
const eventColors: Record<CalendarEventType, string> = {
  meeting: 'indigo',
  issue_deadline: 'amber',
  deviation_deadline: 'red',
  action_deadline: 'purple',
  reminder: 'cyan',
  milestone: 'emerald'
}

// Color mapping for custom event types (used when creating events)
const customEventColors: Record<string, string> = {
  meeting: 'indigo',
  reminder: 'cyan',
  deadline: 'amber',
  milestone: 'emerald'
}

/**
 * Get all calendar events for a project within a date range
 * Aggregates from: protocols, issues, deviations, action items, and custom events
 */
export async function getCalendarEvents(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const events: CalendarEvent[] = []

  // Fetch all data sources in parallel
  const [
    protocolsResult,
    issuesResult,
    deviationsResult,
    actionItemsResult,
    customEventsResult
  ] = await Promise.all([
    // Protocols with meeting_date in range
    supabase
      .from('protocols')
      .select('id, title, protocol_number, meeting_date, meeting_type, status, location')
      .eq('project_id', projectId)
      .gte('meeting_date', startDate)
      .lte('meeting_date', endDate)
      .not('meeting_date', 'is', null),

    // Issues with due_date in range
    supabase
      .from('issues')
      .select('id, title, due_date, status, priority')
      .eq('project_id', projectId)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .not('due_date', 'is', null),

    // Deviations with due_date in range
    supabase
      .from('deviations')
      .select('id, title, due_date, status, severity')
      .eq('project_id', projectId)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .not('due_date', 'is', null),

    // Protocol action items with deadline in range
    supabase
      .from('protocol_action_items')
      .select(`
        id,
        description,
        deadline,
        status,
        protocol:protocols!inner(id, project_id, title, protocol_number)
      `)
      .gte('deadline', startDate)
      .lte('deadline', endDate)
      .not('deadline', 'is', null),

    // Custom calendar events
    supabase
      .from('calendar_events')
      .select('*')
      .eq('project_id', projectId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
  ])

  // Process protocols (meetings)
  if (protocolsResult.data) {
    for (const protocol of protocolsResult.data) {
      if (!protocol.meeting_date) continue
      events.push({
        id: `protocol-${protocol.id}`,
        type: 'meeting',
        title: `${protocol.meeting_type || 'Möte'}: ${protocol.title}`,
        description: `Protokoll #${protocol.protocol_number}`,
        date: protocol.meeting_date,
        location: protocol.location || undefined,
        status: protocol.status,
        link: `/dashboard/projects/${projectId}/protocols/${protocol.id}`,
        color: eventColors.meeting,
        sourceId: protocol.id
      })
    }
  }

  // Process issues
  if (issuesResult.data) {
    for (const issue of issuesResult.data) {
      if (!issue.due_date) continue
      const isOverdue = new Date(issue.due_date) < new Date() && !['resolved', 'closed'].includes(issue.status)
      events.push({
        id: `issue-${issue.id}`,
        type: 'issue_deadline',
        title: `Ärende: ${issue.title}`,
        description: `Förfaller${isOverdue ? ' (försenad)' : ''}`,
        date: issue.due_date,
        status: issue.status,
        priority: issue.priority,
        link: `/dashboard/projects/${projectId}/issues?open=${issue.id}`,
        color: isOverdue ? 'red' : eventColors.issue_deadline,
        sourceId: issue.id
      })
    }
  }

  // Process deviations
  if (deviationsResult.data) {
    for (const deviation of deviationsResult.data) {
      if (!deviation.due_date) continue
      const isOverdue = new Date(deviation.due_date) < new Date() && !['verified', 'closed'].includes(deviation.status)
      events.push({
        id: `deviation-${deviation.id}`,
        type: 'deviation_deadline',
        title: `Avvikelse: ${deviation.title}`,
        description: `Förfaller${isOverdue ? ' (försenad)' : ''}`,
        date: deviation.due_date,
        status: deviation.status,
        severity: deviation.severity,
        link: `/dashboard/projects/${projectId}/deviations?open=${deviation.id}`,
        color: isOverdue ? 'red' : eventColors.deviation_deadline,
        sourceId: deviation.id
      })
    }
  }

  // Process action items
  if (actionItemsResult.data) {
    for (const item of actionItemsResult.data) {
      if (!item.deadline) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const protocol = item.protocol as any
      if (protocol?.project_id !== projectId) continue

      const isOverdue = new Date(item.deadline) < new Date() && item.status !== 'completed'
      events.push({
        id: `action-${item.id}`,
        type: 'action_deadline',
        title: `Åtgärd: ${item.description?.substring(0, 50) || 'Åtgärdspunkt'}`,
        description: `Protokoll #${protocol?.protocol_number}${isOverdue ? ' (försenad)' : ''}`,
        date: item.deadline,
        status: item.status,
        link: `/dashboard/projects/${projectId}/protocols/${protocol?.id}`,
        color: isOverdue ? 'red' : eventColors.action_deadline,
        sourceId: item.id
      })
    }
  }

  // Process custom calendar events
  if (customEventsResult.data) {
    for (const event of customEventsResult.data) {
      const eventType: CalendarEventType = (event.event_type === 'meeting' || event.event_type === 'reminder' || event.event_type === 'milestone')
        ? event.event_type as CalendarEventType
        : 'reminder'
      events.push({
        id: `custom-${event.id}`,
        type: eventType,
        title: event.title,
        description: event.description || undefined,
        date: event.event_date,
        startTime: event.start_time || undefined,
        endTime: event.end_time || undefined,
        location: event.location || undefined,
        link: `/dashboard/projects/${projectId}`,
        color: event.color || eventColors[eventType],
        sourceId: event.id
      })
    }
  }

  // Sort by date and time
  return events.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateCompare !== 0) return dateCompare
    // If same date, sort by start time
    if (a.startTime && b.startTime) {
      return a.startTime.localeCompare(b.startTime)
    }
    return 0
  })
}

/**
 * Get events for a specific date
 */
export async function getEventsForDate(
  projectId: string,
  date: string
): Promise<CalendarEvent[]> {
  return getCalendarEvents(projectId, date, date)
}

/**
 * Get upcoming events (next N days)
 */
export async function getUpcomingEvents(
  projectId: string,
  days: number = 7
): Promise<CalendarEvent[]> {
  const today = new Date()
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

  return getCalendarEvents(
    projectId,
    today.toISOString().split('T')[0],
    futureDate.toISOString().split('T')[0]
  )
}

// ==================== CRUD for Custom Calendar Events ====================

export interface CreateCalendarEventData {
  project_id: string
  title: string
  description?: string
  event_date: string
  start_time?: string
  end_time?: string
  location?: string
  event_type: 'reminder' | 'meeting' | 'deadline' | 'milestone'
  color?: string
}

/**
 * Create a custom calendar event
 */
export async function createCalendarEvent(
  data: CreateCalendarEventData
): Promise<CustomCalendarEvent> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert({
      ...data,
      created_by: user.id,
      color: data.color || customEventColors[data.event_type] || 'indigo'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating calendar event:', error)
    throw new Error('Kunde inte skapa kalenderhändelse')
  }

  revalidatePath(`/dashboard/projects/${data.project_id}`)
  return event
}

export interface UpdateCalendarEventData {
  title?: string
  description?: string
  event_date?: string
  start_time?: string
  end_time?: string
  location?: string
  event_type?: 'reminder' | 'meeting' | 'deadline' | 'milestone'
  color?: string
}

/**
 * Update a custom calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  data: UpdateCalendarEventData
): Promise<CustomCalendarEvent> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: event, error } = await supabase
    .from('calendar_events')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Error updating calendar event:', error)
    throw new Error('Kunde inte uppdatera kalenderhändelse')
  }

  revalidatePath(`/dashboard/projects/${event.project_id}`)
  return event
}

/**
 * Delete a custom calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get event first to get project_id for revalidation
  const { data: event } = await supabase
    .from('calendar_events')
    .select('project_id')
    .eq('id', eventId)
    .single()

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)

  if (error) {
    console.error('Error deleting calendar event:', error)
    throw new Error('Kunde inte radera kalenderhändelse')
  }

  if (event) {
    revalidatePath(`/dashboard/projects/${event.project_id}`)
  }
}

/**
 * Get a single custom calendar event
 */
export async function getCalendarEvent(eventId: string): Promise<CustomCalendarEvent | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching calendar event:', error)
    throw new Error('Kunde inte hämta kalenderhändelse')
  }

  return data
}

/**
 * Get all custom calendar events for a project
 */
export async function getCustomCalendarEvents(projectId: string): Promise<CustomCalendarEvent[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('project_id', projectId)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('Error fetching custom calendar events:', error)
    throw new Error('Kunde inte hämta kalenderhändelser')
  }

  return data || []
}
