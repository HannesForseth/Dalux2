'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Notification {
  id: string
  user_id: string
  type: 'comment_mention' | 'comment_reply' | 'issue_assigned' | 'rfi_assigned' | 'deviation_mention'
  title: string
  message: string
  link: string
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export async function getNotifications(limit = 20): Promise<Notification[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data as Notification[]
  } catch (err) {
    console.error('getNotifications unexpected error:', err)
    return []
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('getUnreadCount unexpected error:', err)
    return 0
  }
}

export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error marking notification as read:', error)
    throw new Error('Kunde inte markera notifikationen som läst')
  }

  revalidatePath('/dashboard')
}

export async function markAllAsRead(): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all as read:', error)
    throw new Error('Kunde inte markera notifikationerna som lästa')
  }

  revalidatePath('/dashboard')
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting notification:', error)
    throw new Error('Kunde inte radera notifikationen')
  }

  revalidatePath('/dashboard')
}

export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  link: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      metadata,
    })

  if (error) {
    console.error('Error creating notification:', error)
    // Don't throw - notification failure shouldn't break the main action
  }
}

// Helper to create mention notifications
export async function createMentionNotification(
  mentionedUserId: string,
  mentionerName: string,
  projectId: string,
  projectName: string,
  documentId: string,
  documentName: string,
  pageNumber: number | null,
  commentPreview: string,
  folderPath: string = '/'
): Promise<void> {
  // Build the link with all context
  const params = new URLSearchParams({
    doc: documentId,
    ...(pageNumber && { page: pageNumber.toString() }),
    folder: folderPath,
  })

  const link = `/dashboard/projects/${projectId}/documents?${params.toString()}`

  const title = `${mentionerName} nämnde dig i en kommentar`
  const message = `I dokumentet "${documentName}"${pageNumber ? ` på sida ${pageNumber}` : ''}: "${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? '...' : ''}"`

  await createNotification(
    mentionedUserId,
    'comment_mention',
    title,
    message,
    link,
    {
      project_id: projectId,
      project_name: projectName,
      document_id: documentId,
      document_name: documentName,
      page_number: pageNumber,
      folder_path: folderPath,
    }
  )
}

// Helper to create deviation mention notifications
export async function createDeviationMentionNotification(
  mentionedUserId: string,
  mentionerName: string,
  projectId: string,
  deviationId: string,
  deviationNumber: number,
  deviationTitle: string,
  commentPreview: string
): Promise<void> {
  const link = `/dashboard/projects/${projectId}/deviations?open=${deviationId}`

  const title = `${mentionerName} nämnde dig i en avvikelsekommentar`
  const message = `I AVV-${String(deviationNumber).padStart(3, '0')} "${deviationTitle}": "${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? '...' : ''}"`

  await createNotification(
    mentionedUserId,
    'deviation_mention',
    title,
    message,
    link,
    {
      project_id: projectId,
      deviation_id: deviationId,
      deviation_number: deviationNumber,
      deviation_title: deviationTitle,
    }
  )
}
