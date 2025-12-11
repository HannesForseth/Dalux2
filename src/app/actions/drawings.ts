'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Drawing,
  DrawingWithUploader,
  CreateDrawingData,
  UpdateDrawingData
} from '@/types/database'
import { uploadFile, deleteFile, getSignedUrl } from './storage'

export async function getProjectDrawings(
  projectId: string,
  category?: string
): Promise<DrawingWithUploader[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectDrawings: User not authenticated')
      return []
    }

    let query = supabase
      .from('drawings')
      .select(`
        *,
        uploader:profiles!drawings_uploaded_by_fkey(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching drawings:', error)
      return []
    }

    return data as DrawingWithUploader[]
  } catch (err) {
    console.error('getProjectDrawings unexpected error:', err)
    return []
  }
}

export async function getDrawing(drawingId: string): Promise<DrawingWithUploader | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getDrawing: User not authenticated')
      return null
    }

    const { data, error } = await supabase
      .from('drawings')
      .select(`
        *,
        uploader:profiles!drawings_uploaded_by_fkey(*)
      `)
      .eq('id', drawingId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching drawing:', error)
      return null
    }

    return data as DrawingWithUploader
  } catch (err) {
    console.error('getDrawing unexpected error:', err)
    return null
  }
}

export async function uploadDrawing(
  projectId: string,
  file: File,
  metadata: CreateDrawingData
): Promise<Drawing> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Validate file type
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Endast PDF och bildformat stöds för ritningar')
  }

  // Upload file to storage
  const uploadResult = await uploadFile('drawings', projectId, file)

  // Create drawing record
  const { data, error } = await supabase
    .from('drawings')
    .insert({
      project_id: projectId,
      name: metadata.name || file.name,
      description: metadata.description || null,
      drawing_number: metadata.drawing_number || null,
      revision: metadata.revision || 'A',
      file_path: uploadResult.path,
      file_size: file.size,
      file_type: file.type,
      category: metadata.category || null,
      is_current: true,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Try to clean up uploaded file
    try {
      await deleteFile('drawings', uploadResult.path)
    } catch {
      // Ignore cleanup errors
    }
    console.error('Error creating drawing:', error)
    throw new Error('Kunde inte spara ritningen')
  }

  revalidatePath(`/dashboard/projects/${projectId}/drawings`)
  return data
}

export async function updateDrawing(
  drawingId: string,
  data: UpdateDrawingData
): Promise<Drawing> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing drawing
  const { data: existing } = await supabase
    .from('drawings')
    .select('project_id')
    .eq('id', drawingId)
    .single()

  if (!existing) {
    throw new Error('Ritningen hittades inte')
  }

  const { data: drawing, error } = await supabase
    .from('drawings')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', drawingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating drawing:', error)
    throw new Error('Kunde inte uppdatera ritningen')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/drawings`)
  return drawing
}

export async function deleteDrawing(drawingId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get drawing info
  const { data: drawing } = await supabase
    .from('drawings')
    .select('project_id, file_path')
    .eq('id', drawingId)
    .single()

  if (!drawing) {
    throw new Error('Ritningen hittades inte')
  }

  // Delete from storage
  try {
    await deleteFile('drawings', drawing.file_path)
  } catch {
    console.error('Warning: Could not delete file from storage')
  }

  // Delete from database
  const { error } = await supabase
    .from('drawings')
    .delete()
    .eq('id', drawingId)

  if (error) {
    console.error('Error deleting drawing:', error)
    throw new Error('Kunde inte radera ritningen')
  }

  revalidatePath(`/dashboard/projects/${drawing.project_id}/drawings`)
}

export async function getDrawingDownloadUrl(drawingId: string): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: drawing } = await supabase
    .from('drawings')
    .select('file_path')
    .eq('id', drawingId)
    .single()

  if (!drawing) {
    throw new Error('Ritningen hittades inte')
  }

  return getSignedUrl('drawings', drawing.file_path, 3600) // 1 hour expiry
}

export async function getDrawingCategories(projectId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('drawings')
      .select('category')
      .eq('project_id', projectId)
      .not('category', 'is', null)

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    // Get unique categories
    const categories = new Set(data?.map(d => d.category).filter(Boolean) as string[])
    return Array.from(categories).sort()
  } catch (err) {
    console.error('getDrawingCategories unexpected error:', err)
    return []
  }
}

export async function getDrawingStats(projectId: string): Promise<{ count: number; categories: number }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { count: 0, categories: 0 }
    }

    const { data, error } = await supabase
      .from('drawings')
      .select('category')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching drawing stats:', error)
      return { count: 0, categories: 0 }
    }

    const categories = new Set(data?.map(d => d.category).filter(Boolean))
    return {
      count: data?.length || 0,
      categories: categories.size
    }
  } catch (err) {
    console.error('getDrawingStats unexpected error:', err)
    return { count: 0, categories: 0 }
  }
}

// Create new revision
export async function createDrawingRevision(
  originalDrawingId: string,
  file: File,
  newRevision: string
): Promise<Drawing> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get original drawing
  const { data: original } = await supabase
    .from('drawings')
    .select('*')
    .eq('id', originalDrawingId)
    .single()

  if (!original) {
    throw new Error('Ursprunglig ritning hittades inte')
  }

  // Upload new file
  const uploadResult = await uploadFile('drawings', original.project_id, file)

  // Mark old drawing as not current
  await supabase
    .from('drawings')
    .update({ is_current: false })
    .eq('id', originalDrawingId)

  // Create new drawing with new revision
  const { data, error } = await supabase
    .from('drawings')
    .insert({
      project_id: original.project_id,
      name: original.name,
      description: original.description,
      drawing_number: original.drawing_number,
      revision: newRevision,
      file_path: uploadResult.path,
      file_size: file.size,
      file_type: file.type,
      category: original.category,
      is_current: true,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Cleanup and restore old drawing
    try {
      await deleteFile('drawings', uploadResult.path)
      await supabase
        .from('drawings')
        .update({ is_current: true })
        .eq('id', originalDrawingId)
    } catch {
      // Ignore cleanup errors
    }
    console.error('Error creating drawing revision:', error)
    throw new Error('Kunde inte skapa ny revision')
  }

  revalidatePath(`/dashboard/projects/${original.project_id}/drawings`)
  return data
}
