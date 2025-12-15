'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createMentionNotification } from './notifications'

export interface DocumentComment {
  id: string
  document_id: string
  project_id: string
  author_id: string
  content: string
  page_number: number | null
  position_x: number | null
  position_y: number | null
  parent_id: string | null
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentCommentWithAuthor extends DocumentComment {
  author: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email: string
  }
  replies?: DocumentCommentWithAuthor[]
  mentions?: {
    id: string
    mentioned_user_id: string
    mentioned_user: {
      id: string
      full_name: string | null
      email: string
    }
  }[]
}

export interface CreateCommentData {
  content: string
  page_number?: number
  position_x?: number
  position_y?: number
  parent_id?: string
  mentioned_user_ids?: string[]
  mentioned_group_ids?: string[]
}

export async function getDocumentComments(
  documentId: string
): Promise<DocumentCommentWithAuthor[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getDocumentComments: User not authenticated')
      return []
    }

    // Get top-level comments (no parent_id)
    const { data, error } = await supabase
      .from('document_comments')
      .select(`
        *,
        author:profiles!document_comments_author_id_fkey(id, full_name, avatar_url, email),
        mentions:document_comment_mentions(
          id,
          mentioned_user_id,
          mentioned_user:profiles!document_comment_mentions_mentioned_user_id_fkey(id, full_name, email)
        )
      `)
      .eq('document_id', documentId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching document comments:', error)
      return []
    }

    // Fetch replies for each top-level comment
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('document_comments')
          .select(`
            *,
            author:profiles!document_comments_author_id_fkey(id, full_name, avatar_url, email),
            mentions:document_comment_mentions(
              id,
              mentioned_user_id,
              mentioned_user:profiles!document_comment_mentions_mentioned_user_id_fkey(id, full_name, email)
            )
          `)
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true })

        return {
          ...comment,
          replies: replies || []
        } as DocumentCommentWithAuthor
      })
    )

    return commentsWithReplies
  } catch (err) {
    console.error('getDocumentComments unexpected error:', err)
    return []
  }
}

export async function getDocumentCommentsForPage(
  documentId: string,
  pageNumber: number
): Promise<DocumentCommentWithAuthor[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('document_comments')
      .select(`
        *,
        author:profiles!document_comments_author_id_fkey(id, full_name, avatar_url, email),
        mentions:document_comment_mentions(
          id,
          mentioned_user_id,
          mentioned_user:profiles!document_comment_mentions_mentioned_user_id_fkey(id, full_name, email)
        )
      `)
      .eq('document_id', documentId)
      .eq('page_number', pageNumber)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching page comments:', error)
      return []
    }

    return (data || []) as DocumentCommentWithAuthor[]
  } catch (err) {
    console.error('getDocumentCommentsForPage unexpected error:', err)
    return []
  }
}

export async function createDocumentComment(
  documentId: string,
  projectId: string,
  data: CreateCommentData
): Promise<DocumentComment> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Create the comment
  const { data: comment, error } = await supabase
    .from('document_comments')
    .insert({
      document_id: documentId,
      project_id: projectId,
      author_id: user.id,
      content: data.content,
      page_number: data.page_number || null,
      position_x: data.position_x || null,
      position_y: data.position_y || null,
      parent_id: data.parent_id || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating comment:', error)
    throw new Error('Kunde inte skapa kommentaren')
  }

  // Collect all user IDs to mention (from explicit mentions + group expansion)
  const allMentionedUserIds = new Set<string>(data.mentioned_user_ids || [])

  // Expand group mentions to individual user IDs
  if (data.mentioned_group_ids && data.mentioned_group_ids.length > 0) {
    const { data: groupMembers } = await supabase
      .from('project_members')
      .select('user_id')
      .in('group_id', data.mentioned_group_ids)
      .eq('project_id', projectId)
      .eq('status', 'active')

    if (groupMembers) {
      for (const member of groupMembers) {
        allMentionedUserIds.add(member.user_id)
      }
    }
  }

  // Create mentions and send notifications if we have any users to mention
  if (allMentionedUserIds.size > 0) {
    const mentions = Array.from(allMentionedUserIds).map(userId => ({
      comment_id: comment.id,
      mentioned_user_id: userId,
    }))

    const { error: mentionError } = await supabase
      .from('document_comment_mentions')
      .insert(mentions)

    if (mentionError) {
      console.error('Error creating mentions:', mentionError)
      // Don't throw - comment was created successfully
    }

    // Get info needed for notifications
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    const { data: document } = await supabase
      .from('documents')
      .select('name, folder_path')
      .eq('id', documentId)
      .single()

    const authorName = authorProfile?.full_name || authorProfile?.email || 'Någon'
    const projectName = project?.name || 'Projekt'
    const documentName = document?.name || 'Dokument'
    const folderPath = document?.folder_path || '/'

    // Send notification to each mentioned user (except self)
    for (const mentionedUserId of allMentionedUserIds) {
      if (mentionedUserId !== user.id) {
        await createMentionNotification(
          mentionedUserId,
          authorName,
          projectId,
          projectName,
          documentId,
          documentName,
          data.page_number || null,
          data.content,
          folderPath
        )
      }
    }
  }

  try {
    revalidatePath(`/dashboard/projects/${projectId}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }
  return comment
}

export async function updateDocumentComment(
  commentId: string,
  content: string,
  mentionedUserIds?: string[]
): Promise<DocumentComment> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the comment to verify ownership
  const { data: existing } = await supabase
    .from('document_comments')
    .select('project_id, author_id')
    .eq('id', commentId)
    .single()

  if (!existing) {
    throw new Error('Kommentaren hittades inte')
  }

  if (existing.author_id !== user.id) {
    throw new Error('Du kan bara redigera dina egna kommentarer')
  }

  // Update the comment
  const { data: comment, error } = await supabase
    .from('document_comments')
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating comment:', error)
    throw new Error('Kunde inte uppdatera kommentaren')
  }

  // Update mentions if provided
  if (mentionedUserIds !== undefined) {
    // Delete existing mentions
    await supabase
      .from('document_comment_mentions')
      .delete()
      .eq('comment_id', commentId)

    // Insert new mentions
    if (mentionedUserIds.length > 0) {
      const mentions = mentionedUserIds.map(userId => ({
        comment_id: commentId,
        mentioned_user_id: userId,
      }))

      await supabase
        .from('document_comment_mentions')
        .insert(mentions)
    }
  }

  try {
    revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }
  return comment
}

export async function deleteDocumentComment(commentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the comment to verify ownership and get project_id
  const { data: existing } = await supabase
    .from('document_comments')
    .select('project_id, author_id')
    .eq('id', commentId)
    .single()

  if (!existing) {
    throw new Error('Kommentaren hittades inte')
  }

  if (existing.author_id !== user.id) {
    throw new Error('Du kan bara radera dina egna kommentarer')
  }

  const { error } = await supabase
    .from('document_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Error deleting comment:', error)
    throw new Error('Kunde inte radera kommentaren')
  }

  try {
    revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }
}

export async function resolveDocumentComment(
  commentId: string,
  isResolved: boolean
): Promise<DocumentComment> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing comment
  const { data: existing } = await supabase
    .from('document_comments')
    .select('project_id')
    .eq('id', commentId)
    .single()

  if (!existing) {
    throw new Error('Kommentaren hittades inte')
  }

  const { data: comment, error } = await supabase
    .from('document_comments')
    .update({
      is_resolved: isResolved,
      resolved_by: isResolved ? user.id : null,
      resolved_at: isResolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select()
    .single()

  if (error) {
    console.error('Error resolving comment:', error)
    throw new Error('Kunde inte uppdatera kommentaren')
  }

  try {
    revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }
  return comment
}

export async function getProjectMembersForMentions(
  projectId: string
): Promise<{ id: string; full_name: string | null; email: string }[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // First get project member user IDs
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('status', 'active')

    if (membersError) {
      console.error('Error fetching project members:', membersError)
      return []
    }

    if (!members || members.length === 0) {
      return []
    }

    // Then get profiles for those users
    const userIds = members.map(m => m.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return []
    }

    return (profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email || ''
    }))
  } catch (err) {
    console.error('getProjectMembersForMentions unexpected error:', err)
    return []
  }
}
