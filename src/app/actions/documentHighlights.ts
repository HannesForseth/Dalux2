'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  DocumentHighlight,
  DocumentHighlightWithCreator,
  CreateHighlightData,
  UpdateHighlightData,
  HighlightColor
} from '@/types/database'

export async function getDocumentHighlights(
  documentId: string
): Promise<DocumentHighlightWithCreator[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getDocumentHighlights: User not authenticated')
      return []
    }

    const { data, error } = await supabase
      .from('document_highlights')
      .select(`
        *,
        creator:profiles!document_highlights_created_by_fkey(*)
      `)
      .eq('document_id', documentId)
      .order('page_number', { ascending: true })
      .order('start_offset', { ascending: true })

    if (error) {
      console.error('Error fetching document highlights:', error)
      return []
    }

    return data as DocumentHighlightWithCreator[]
  } catch (err) {
    console.error('getDocumentHighlights unexpected error:', err)
    return []
  }
}

export async function getHighlightsByPage(
  documentId: string,
  pageNumber: number
): Promise<DocumentHighlightWithCreator[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('document_highlights')
      .select(`
        *,
        creator:profiles!document_highlights_created_by_fkey(*)
      `)
      .eq('document_id', documentId)
      .eq('page_number', pageNumber)
      .order('start_offset', { ascending: true })

    if (error) {
      console.error('Error fetching page highlights:', error)
      return []
    }

    return data as DocumentHighlightWithCreator[]
  } catch (err) {
    console.error('getHighlightsByPage unexpected error:', err)
    return []
  }
}

export async function createHighlight(
  documentId: string,
  projectId: string,
  data: CreateHighlightData
): Promise<DocumentHighlight> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: highlight, error } = await supabase
    .from('document_highlights')
    .insert({
      document_id: documentId,
      project_id: projectId,
      created_by: user.id,
      page_number: data.page_number,
      start_offset: data.start_offset,
      end_offset: data.end_offset,
      selected_text: data.selected_text,
      color: data.color || 'yellow',
      note: data.note || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating highlight:', error)
    throw new Error('Kunde inte skapa markering')
  }

  revalidatePath(`/dashboard/projects/${projectId}/documents`)
  return highlight
}

export async function updateHighlight(
  highlightId: string,
  data: UpdateHighlightData
): Promise<DocumentHighlight> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing highlight
  const { data: existing } = await supabase
    .from('document_highlights')
    .select('project_id, created_by')
    .eq('id', highlightId)
    .single()

  if (!existing) {
    throw new Error('Markeringen hittades inte')
  }

  // Check ownership
  if (existing.created_by !== user.id) {
    throw new Error('Du kan bara redigera dina egna markeringar')
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.color !== undefined) {
    updateData.color = data.color
  }
  if (data.note !== undefined) {
    updateData.note = data.note
  }

  const { data: highlight, error } = await supabase
    .from('document_highlights')
    .update(updateData)
    .eq('id', highlightId)
    .select()
    .single()

  if (error) {
    console.error('Error updating highlight:', error)
    throw new Error('Kunde inte uppdatera markeringen')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  return highlight
}

export async function deleteHighlight(highlightId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get highlight info first
  const { data: highlight } = await supabase
    .from('document_highlights')
    .select('project_id, created_by')
    .eq('id', highlightId)
    .single()

  if (!highlight) {
    throw new Error('Markeringen hittades inte')
  }

  // Check ownership
  if (highlight.created_by !== user.id) {
    throw new Error('Du kan bara ta bort dina egna markeringar')
  }

  const { error } = await supabase
    .from('document_highlights')
    .delete()
    .eq('id', highlightId)

  if (error) {
    console.error('Error deleting highlight:', error)
    throw new Error('Kunde inte ta bort markeringen')
  }

  revalidatePath(`/dashboard/projects/${highlight.project_id}/documents`)
}

export async function getHighlightStats(documentId: string): Promise<{
  total: number
  byColor: Record<HighlightColor, number>
  byPage: Record<number, number>
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { total: 0, byColor: { yellow: 0, green: 0, blue: 0, pink: 0, orange: 0 }, byPage: {} }
    }

    const { data, error } = await supabase
      .from('document_highlights')
      .select('color, page_number')
      .eq('document_id', documentId)

    if (error) {
      console.error('Error fetching highlight stats:', error)
      return { total: 0, byColor: { yellow: 0, green: 0, blue: 0, pink: 0, orange: 0 }, byPage: {} }
    }

    const byColor: Record<HighlightColor, number> = {
      yellow: 0,
      green: 0,
      blue: 0,
      pink: 0,
      orange: 0
    }

    const byPage: Record<number, number> = {}

    for (const item of data || []) {
      byColor[item.color as HighlightColor] = (byColor[item.color as HighlightColor] || 0) + 1
      byPage[item.page_number] = (byPage[item.page_number] || 0) + 1
    }

    return {
      total: data?.length || 0,
      byColor,
      byPage
    }
  } catch (err) {
    console.error('getHighlightStats unexpected error:', err)
    return { total: 0, byColor: { yellow: 0, green: 0, blue: 0, pink: 0, orange: 0 }, byPage: {} }
  }
}
