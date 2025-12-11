'use server'

import { createClient } from '@/lib/supabase/server'

export type StorageBucket =
  | 'project-images'
  | 'documents'
  | 'drawings'
  | 'issue-attachments'
  | 'rfi-attachments'

interface UploadResult {
  path: string
  fullPath: string
  publicUrl: string | null
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: StorageBucket,
  projectId: string,
  file: File,
  subfolder?: string
): Promise<UploadResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Generate unique filename
  const timestamp = Date.now()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = `${timestamp}_${cleanFileName}`

  // Build path: projectId/[subfolder/]filename
  const path = subfolder
    ? `${projectId}/${subfolder}/${fileName}`
    : `${projectId}/${fileName}`

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error('Kunde inte ladda upp fil')
  }

  // Get public URL if bucket is public
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return {
    path: data.path,
    fullPath: data.fullPath,
    publicUrl: urlData?.publicUrl || null
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    console.error('Storage delete error:', error)
    throw new Error('Kunde inte radera fil')
  }
}

/**
 * Get a signed URL for a private file (valid for 1 hour)
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    console.error('Signed URL error:', error)
    throw new Error('Kunde inte skapa filåtkomst')
  }

  return data.signedUrl
}

/**
 * Get public URL for a file
 */
export async function getPublicUrl(
  bucket: StorageBucket,
  path: string
): Promise<string> {
  const supabase = await createClient()

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * List files in a folder
 */
export async function listFiles(
  bucket: StorageBucket,
  folderPath: string
): Promise<{ name: string; id: string; created_at: string }[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folderPath, {
      sortBy: { column: 'created_at', order: 'desc' }
    })

  if (error) {
    console.error('List files error:', error)
    throw new Error('Kunde inte lista filer')
  }

  return data || []
}

/**
 * Upload project image
 */
export async function uploadProjectImage(
  projectId: string,
  file: File
): Promise<string> {
  const result = await uploadFile('project-images', projectId, file)
  return result.publicUrl || result.path
}

/**
 * Delete project image
 */
export async function deleteProjectImage(path: string): Promise<void> {
  await deleteFile('project-images', path)
}
