'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Document,
  DocumentWithUploader,
  CreateDocumentData,
  UpdateDocumentData
} from '@/types/database'
import { uploadFile, deleteFile, getSignedUrl } from './storage'

export async function getProjectDocuments(
  projectId: string,
  folderPath?: string
): Promise<DocumentWithUploader[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectDocuments: User not authenticated')
      return []
    }

    let query = supabase
      .from('documents')
      .select(`
        *,
        uploader:profiles!documents_uploaded_by_fkey(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (folderPath) {
      query = query.eq('folder_path', folderPath)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      return []
    }

    return data as DocumentWithUploader[]
  } catch (err) {
    console.error('getProjectDocuments unexpected error:', err)
    return []
  }
}

export async function getDocument(documentId: string): Promise<DocumentWithUploader | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getDocument: User not authenticated')
      return null
    }

    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploader:profiles!documents_uploaded_by_fkey(*)
      `)
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching document:', error)
      return null
    }

    return data as DocumentWithUploader
  } catch (err) {
    console.error('getDocument unexpected error:', err)
    return null
  }
}

export async function uploadDocument(
  projectId: string,
  file: File,
  metadata: CreateDocumentData
): Promise<Document> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Upload file to storage
  const uploadResult = await uploadFile('documents', projectId, file)

  // Create document record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      name: metadata.name || file.name,
      description: metadata.description || null,
      file_path: uploadResult.path,
      file_size: file.size,
      file_type: file.type,
      folder_path: metadata.folder_path || '/',
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Try to clean up uploaded file
    try {
      await deleteFile('documents', uploadResult.path)
    } catch {
      // Ignore cleanup errors
    }
    console.error('Error creating document:', error)
    throw new Error('Kunde inte spara dokumentet')
  }

  revalidatePath(`/dashboard/projects/${projectId}/documents`)
  return data
}

export async function updateDocument(
  documentId: string,
  data: UpdateDocumentData
): Promise<Document> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing document
  const { data: existing } = await supabase
    .from('documents')
    .select('project_id')
    .eq('id', documentId)
    .single()

  if (!existing) {
    throw new Error('Dokumentet hittades inte')
  }

  const { data: document, error } = await supabase
    .from('documents')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating document:', error)
    throw new Error('Kunde inte uppdatera dokumentet')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  return document
}

export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get document info
  const { data: document } = await supabase
    .from('documents')
    .select('project_id, file_path')
    .eq('id', documentId)
    .single()

  if (!document) {
    throw new Error('Dokumentet hittades inte')
  }

  // Delete from storage
  try {
    await deleteFile('documents', document.file_path)
  } catch {
    console.error('Warning: Could not delete file from storage')
  }

  // Delete from database
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (error) {
    console.error('Error deleting document:', error)
    throw new Error('Kunde inte radera dokumentet')
  }

  revalidatePath(`/dashboard/projects/${document.project_id}/documents`)
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: document } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (!document) {
    throw new Error('Dokumentet hittades inte')
  }

  return getSignedUrl('documents', document.file_path, 3600) // 1 hour expiry
}

export async function getDocumentFolders(projectId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return ['/']
    }

    const { data, error } = await supabase
      .from('documents')
      .select('folder_path')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching folders:', error)
      return ['/']
    }

    // Get unique folder paths
    const folders = new Set(data?.map(d => d.folder_path) || [])
    folders.add('/') // Always include root
    return Array.from(folders).sort()
  } catch (err) {
    console.error('getDocumentFolders unexpected error:', err)
    return ['/']
  }
}

export async function getDocumentStats(projectId: string): Promise<{ count: number; totalSize: number }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { count: 0, totalSize: 0 }
    }

    const { data, error } = await supabase
      .from('documents')
      .select('file_size')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching document stats:', error)
      return { count: 0, totalSize: 0 }
    }

    return {
      count: data?.length || 0,
      totalSize: data?.reduce((sum, d) => sum + d.file_size, 0) || 0
    }
  } catch (err) {
    console.error('getDocumentStats unexpected error:', err)
    return { count: 0, totalSize: 0 }
  }
}
