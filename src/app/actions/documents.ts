'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyProjectMembership } from '@/lib/auth-helpers'
import {
  uuidSchema,
  validateInput
} from '@/lib/validations'
import { z } from 'zod'
import type {
  Document,
  DocumentWithUploader,
  CreateDocumentData,
  UpdateDocumentData,
  DocumentVersion,
  DocumentVersionWithUploader
} from '@/types/database'
import { uploadFile, deleteFile, getSignedUrl, getSignedUploadUrl, type SignedUploadUrlResult } from './storage'

// Local validation schemas
const folderPathSchema = z.string().max(500, 'Sökvägen är för lång').optional()

const moveDocumentSchema = z.object({
  documentId: uuidSchema,
  newFolderPath: z.string().max(500, 'Sökvägen är för lång'),
})

const moveMultipleSchema = z.object({
  documentIds: z.array(uuidSchema).min(1, 'Minst ett dokument krävs'),
  newFolderPath: z.string().max(500, 'Sökvägen är för lång'),
})

const restoreVersionSchema = z.object({
  documentId: uuidSchema,
  versionId: uuidSchema,
})

const comparisonSchema = z.object({
  documentId: uuidSchema,
  version1: z.number().int().positive('Version måste vara ett positivt tal'),
  version2: z.number().int().positive('Version måste vara ett positivt tal'),
})

const createDocumentAfterUploadSchema = z.object({
  projectId: uuidSchema,
  filePath: z.string().min(1, 'Filsökväg krävs'),
  fileSize: z.number().int().positive('Filstorlek måste vara positiv'),
  fileType: z.string().min(1, 'Filtyp krävs'),
})

const createVersionAfterUploadSchema = z.object({
  documentId: uuidSchema,
  filePath: z.string().min(1, 'Filsökväg krävs'),
  fileSize: z.number().int().positive('Filstorlek måste vara positiv'),
  fileType: z.string().min(1, 'Filtyp krävs'),
  changeNote: z.string().max(500, 'Ändringsnotering är för lång').optional(),
})

const checkDuplicateDocumentSchema = z.object({
  projectId: uuidSchema,
  fileName: z.string().min(1, 'Filnamn krävs').max(255, 'Filnamnet är för långt'),
  folderPath: z.string().max(500, 'Sökvägen är för lång'),
})

const getDocumentUploadUrlSchema = z.object({
  projectId: uuidSchema,
  fileName: z.string().min(1, 'Filnamn krävs').max(255, 'Filnamnet är för långt'),
})

export async function getProjectDocuments(
  projectId: string,
  folderPath?: string
): Promise<DocumentWithUploader[]> {
  try {
    // Validate input
    const validatedProjectId = validateInput(uuidSchema, projectId)
    const validatedFolderPath = folderPath ? validateInput(folderPathSchema, folderPath) : undefined

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectDocuments: User not authenticated')
      return []
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedProjectId, user.id)
    if (!hasAccess) {
      console.error('getProjectDocuments: User not a member of project')
      return []
    }

    let query = supabase
      .from('documents')
      .select(`
        *,
        uploader:profiles!documents_uploaded_by_fkey(*)
      `)
      .eq('project_id', validatedProjectId)
      .order('created_at', { ascending: false })

    if (validatedFolderPath) {
      query = query.eq('folder_path', validatedFolderPath)
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
    // Validate input
    const validatedId = validateInput(uuidSchema, documentId)

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
      .eq('id', validatedId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching document:', error)
      return null
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(data.project_id, user.id)
    if (!hasAccess) {
      console.error('getDocument: User not a member of project')
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
  // Validate input
  const validatedProjectId = validateInput(uuidSchema, projectId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Upload file to storage
  const uploadResult = await uploadFile('documents', validatedProjectId, file)

  // Create document record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      project_id: validatedProjectId,
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

  revalidatePath(`/dashboard/projects/${validatedProjectId}/documents`)
  return data
}

export async function updateDocument(
  documentId: string,
  data: UpdateDocumentData
): Promise<Document> {
  // Validate input
  const validatedId = validateInput(uuidSchema, documentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing document
  const { data: existing } = await supabase
    .from('documents')
    .select('project_id')
    .eq('id', validatedId)
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
    .eq('id', validatedId)
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
  // Validate input
  const validatedId = validateInput(uuidSchema, documentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get document info
  const { data: document } = await supabase
    .from('documents')
    .select('project_id, file_path')
    .eq('id', validatedId)
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
    .eq('id', validatedId)

  if (error) {
    console.error('Error deleting document:', error)
    throw new Error('Kunde inte radera dokumentet')
  }

  revalidatePath(`/dashboard/projects/${document.project_id}/documents`)
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  // Validate input
  const validatedId = validateInput(uuidSchema, documentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: document } = await supabase
    .from('documents')
    .select('file_path, project_id')
    .eq('id', validatedId)
    .single()

  if (!document) {
    throw new Error('Dokumentet hittades inte')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(document.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  return getSignedUrl('documents', document.file_path, 3600) // 1 hour expiry
}

export async function getDocumentFolders(projectId: string): Promise<string[]> {
  try {
    // Validate input
    const validatedId = validateInput(uuidSchema, projectId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return ['/']
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedId, user.id)
    if (!hasAccess) {
      console.error('getDocumentFolders: User not a member of project')
      return ['/']
    }

    const { data, error } = await supabase
      .from('documents')
      .select('folder_path')
      .eq('project_id', validatedId)

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

export async function moveDocument(
  documentId: string,
  newFolderPath: string
): Promise<Document> {
  // Validate input
  const validated = validateInput(moveDocumentSchema, { documentId, newFolderPath })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing document
  const { data: existing } = await supabase
    .from('documents')
    .select('project_id, folder_path')
    .eq('id', validated.documentId)
    .single()

  if (!existing) {
    throw new Error('Dokumentet hittades inte')
  }

  // Normalize path
  let normalizedPath = validated.newFolderPath
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath
  }
  if (!normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath + '/'
  }

  const { data: document, error } = await supabase
    .from('documents')
    .update({
      folder_path: normalizedPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.documentId)
    .select()
    .single()

  if (error) {
    console.error('Error moving document:', error)
    throw new Error('Kunde inte flytta dokumentet')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  return document
}

export async function moveMultipleDocuments(
  documentIds: string[],
  newFolderPath: string
): Promise<void> {
  // Validate input
  const validated = validateInput(moveMultipleSchema, { documentIds, newFolderPath })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Normalize path
  let normalizedPath = validated.newFolderPath
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath
  }
  if (!normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath + '/'
  }

  // Get project ID from first document for revalidation
  const { data: firstDoc } = await supabase
    .from('documents')
    .select('project_id')
    .eq('id', validated.documentIds[0])
    .single()

  const { error } = await supabase
    .from('documents')
    .update({
      folder_path: normalizedPath,
      updated_at: new Date().toISOString(),
    })
    .in('id', validated.documentIds)

  if (error) {
    console.error('Error moving documents:', error)
    throw new Error('Kunde inte flytta dokumenten')
  }

  if (firstDoc) {
    revalidatePath(`/dashboard/projects/${firstDoc.project_id}/documents`)
  }
}

export async function getDocumentStats(projectId: string): Promise<{ count: number; totalSize: number }> {
  try {
    // Validate input
    const validatedId = validateInput(uuidSchema, projectId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { count: 0, totalSize: 0 }
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedId, user.id)
    if (!hasAccess) {
      console.error('getDocumentStats: User not a member of project')
      return { count: 0, totalSize: 0 }
    }

    const { data, error } = await supabase
      .from('documents')
      .select('file_size')
      .eq('project_id', validatedId)

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

// ===============================
// Version Management Functions
// ===============================

/**
 * Get all versions for a document
 */
export async function getDocumentVersions(
  documentId: string
): Promise<DocumentVersionWithUploader[]> {
  try {
    // Validate input
    const validatedId = validateInput(uuidSchema, documentId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getDocumentVersions: User not authenticated')
      return []
    }

    // Fetch document to verify project access
    const { data: document } = await supabase
      .from('documents')
      .select('project_id')
      .eq('id', validatedId)
      .single()

    if (!document) {
      return []
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(document.project_id, user.id)
    if (!hasAccess) {
      console.error('getDocumentVersions: User not a member of project')
      return []
    }

    const { data, error } = await supabase
      .from('document_versions')
      .select(`
        *,
        uploader:profiles!document_versions_uploaded_by_fkey(*)
      `)
      .eq('document_id', validatedId)
      .order('version', { ascending: false })

    if (error) {
      console.error('Error fetching document versions:', error)
      return []
    }

    return data as DocumentVersionWithUploader[]
  } catch (err) {
    console.error('getDocumentVersions unexpected error:', err)
    return []
  }
}

/**
 * Upload a new version of an existing document
 * - Saves current file as a version in document_versions
 * - Uploads new file
 * - Updates document with new file info and incremented version
 */
export async function uploadNewVersion(
  documentId: string,
  file: File,
  changeNote?: string
): Promise<Document> {
  // Validate input
  const validatedId = validateInput(uuidSchema, documentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing document
  const { data: existingDoc, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', validatedId)
    .single()

  if (fetchError || !existingDoc) {
    throw new Error('Dokumentet hittades inte')
  }

  // Save current file as a version in document_versions
  const { error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: validatedId,
      version: existingDoc.version,
      file_path: existingDoc.file_path,
      file_size: existingDoc.file_size,
      change_note: changeNote || null,
      uploaded_by: user.id,
    })

  if (versionError) {
    console.error('Error saving version:', versionError)
    throw new Error('Kunde inte spara versionshistorik')
  }

  // Upload new file to storage
  const uploadResult = await uploadFile('documents', existingDoc.project_id, file)

  // Update document with new file info
  const { data: updatedDoc, error: updateError } = await supabase
    .from('documents')
    .update({
      file_path: uploadResult.path,
      file_size: file.size,
      file_type: file.type,
      version: existingDoc.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validatedId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating document:', updateError)
    throw new Error('Kunde inte uppdatera dokumentet')
  }

  revalidatePath(`/dashboard/projects/${existingDoc.project_id}/documents`)
  return updatedDoc
}

/**
 * Restore a previous version of a document
 * - Saves current file as a new version
 * - Copies the selected version's file as current
 * - Increments version number
 */
export async function restoreVersion(
  documentId: string,
  versionId: string
): Promise<Document> {
  // Validate input
  const validated = validateInput(restoreVersionSchema, { documentId, versionId })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get current document
  const { data: existingDoc, error: fetchDocError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', validated.documentId)
    .single()

  if (fetchDocError || !existingDoc) {
    throw new Error('Dokumentet hittades inte')
  }

  // Get the version to restore
  const { data: versionToRestore, error: fetchVersionError } = await supabase
    .from('document_versions')
    .select('*')
    .eq('id', validated.versionId)
    .single()

  if (fetchVersionError || !versionToRestore) {
    throw new Error('Versionen hittades inte')
  }

  // Save current file as a new version
  const { error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: validated.documentId,
      version: existingDoc.version,
      file_path: existingDoc.file_path,
      file_size: existingDoc.file_size,
      change_note: `Ersatt av återställning till v${versionToRestore.version}`,
      uploaded_by: user.id,
    })

  if (versionError) {
    console.error('Error saving current version:', versionError)
    throw new Error('Kunde inte spara nuvarande version')
  }

  // Update document with restored version's file info
  const { data: updatedDoc, error: updateError } = await supabase
    .from('documents')
    .update({
      file_path: versionToRestore.file_path,
      file_size: versionToRestore.file_size,
      version: existingDoc.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.documentId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating document:', updateError)
    throw new Error('Kunde inte återställa versionen')
  }

  revalidatePath(`/dashboard/projects/${existingDoc.project_id}/documents`)
  return updatedDoc
}

/**
 * Get download URL for a specific version
 */
export async function getVersionDownloadUrl(versionId: string): Promise<string> {
  // Validate input
  const validatedVersionId = validateInput(uuidSchema, versionId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: version, error } = await supabase
    .from('document_versions')
    .select('file_path, document_id')
    .eq('id', validatedVersionId)
    .single()

  if (error || !version) {
    throw new Error('Versionen hittades inte')
  }

  // Get document to verify project access
  const { data: document } = await supabase
    .from('documents')
    .select('project_id')
    .eq('id', version.document_id)
    .single()

  if (!document) {
    throw new Error('Dokumentet hittades inte')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(document.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  return getSignedUrl('documents', version.file_path, 3600) // 1 hour expiry
}

/**
 * Check if a document with the same name exists in the same folder
 * Returns the existing document if found, null otherwise
 */
export async function checkDuplicateDocument(
  projectId: string,
  fileName: string,
  folderPath: string
): Promise<Document | null> {
  try {
    // Validate input
    const validated = validateInput(checkDuplicateDocumentSchema, { projectId, fileName, folderPath })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validated.projectId, user.id)
    if (!hasAccess) {
      console.error('checkDuplicateDocument: User not a member of project')
      return null
    }

    // Normalize folder path
    let normalizedPath = validated.folderPath
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath
    }
    if (!normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath + '/'
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', validated.projectId)
      .eq('name', validated.fileName)
      .eq('folder_path', normalizedPath)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error checking duplicate:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('checkDuplicateDocument unexpected error:', err)
    return null
  }
}

/**
 * Get URLs for comparing two versions side by side
 */
export async function getComparisonUrls(
  documentId: string,
  version1: number,
  version2: number
): Promise<{ url1: string; url2: string }> {
  // Validate input
  const validated = validateInput(comparisonSchema, { documentId, version1, version2 })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the document for current version info
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('version, file_path, project_id')
    .eq('id', validated.documentId)
    .single()

  if (docError || !document) {
    throw new Error('Dokumentet hittades inte')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(document.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Helper to get URL for a specific version
  const getUrlForVersion = async (version: number): Promise<string> => {
    if (version === document.version) {
      // Current version - get from documents table
      return getSignedUrl('documents', document.file_path, 3600)
    } else {
      // Historical version - get from document_versions table
      const { data: versionData, error: versionError } = await supabase
        .from('document_versions')
        .select('file_path')
        .eq('document_id', validated.documentId)
        .eq('version', version)
        .single()

      if (versionError || !versionData) {
        throw new Error(`Version ${version} hittades inte`)
      }

      return getSignedUrl('documents', versionData.file_path, 3600)
    }
  }

  const [url1, url2] = await Promise.all([
    getUrlForVersion(validated.version1),
    getUrlForVersion(validated.version2)
  ])

  return { url1, url2 }
}

// ===============================
// Direct Upload Functions (bypasses Vercel 4.5MB limit)
// ===============================

export interface DocumentUploadUrlResult extends SignedUploadUrlResult {
  bucket: 'documents'
}

/**
 * Get a signed URL for direct client-side document upload
 * This allows uploading files larger than Vercel's 4.5MB limit
 */
export async function getDocumentUploadUrl(
  projectId: string,
  fileName: string
): Promise<DocumentUploadUrlResult> {
  // Validate input
  const validated = validateInput(getDocumentUploadUrlSchema, { projectId, fileName })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Verify user has access to project
  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', validated.projectId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  const result = await getSignedUploadUrl('documents', validated.projectId, validated.fileName)

  return {
    ...result,
    bucket: 'documents'
  }
}

/**
 * Create a document record after successful direct upload
 * Call this after the client has uploaded the file directly to storage
 */
export async function createDocumentAfterUpload(
  projectId: string,
  filePath: string,
  fileSize: number,
  fileType: string,
  metadata: CreateDocumentData
): Promise<Document> {
  // Validate input
  const validated = validateInput(createDocumentAfterUploadSchema, { projectId, filePath, fileSize, fileType })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Create document record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      project_id: validated.projectId,
      name: metadata.name,
      description: metadata.description || null,
      file_path: validated.filePath,
      file_size: validated.fileSize,
      file_type: validated.fileType,
      folder_path: metadata.folder_path || '/',
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Try to clean up uploaded file on error
    try {
      await deleteFile('documents', validated.filePath)
    } catch {
      // Ignore cleanup errors
    }
    console.error('Error creating document:', error)
    throw new Error('Kunde inte spara dokumentet')
  }

  revalidatePath(`/dashboard/projects/${validated.projectId}/documents`)
  return data
}

/**
 * Get a signed URL for direct client-side version upload
 */
export async function getVersionUploadUrl(
  documentId: string
): Promise<DocumentUploadUrlResult & { projectId: string }> {
  // Validate input
  const validatedDocumentId = validateInput(uuidSchema, documentId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get document info
  const { data: document, error } = await supabase
    .from('documents')
    .select('project_id, name')
    .eq('id', validatedDocumentId)
    .single()

  if (error || !document) {
    throw new Error('Dokumentet hittades inte')
  }

  const result = await getSignedUploadUrl('documents', document.project_id, document.name)

  return {
    ...result,
    bucket: 'documents',
    projectId: document.project_id
  }
}

/**
 * Create a new version record after successful direct upload
 * Call this after the client has uploaded the new version directly to storage
 */
export async function createVersionAfterUpload(
  documentId: string,
  filePath: string,
  fileSize: number,
  fileType: string,
  changeNote?: string
): Promise<Document> {
  // Validate input
  const validated = validateInput(createVersionAfterUploadSchema, { documentId, filePath, fileSize, fileType, changeNote })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing document
  const { data: existingDoc, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', validated.documentId)
    .single()

  if (fetchError || !existingDoc) {
    throw new Error('Dokumentet hittades inte')
  }

  // Save current file as a version in document_versions
  const { error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: validated.documentId,
      version: existingDoc.version,
      file_path: existingDoc.file_path,
      file_size: existingDoc.file_size,
      change_note: validated.changeNote || null,
      uploaded_by: user.id,
    })

  if (versionError) {
    console.error('Error saving version:', versionError)
    throw new Error('Kunde inte spara versionshistorik')
  }

  // Update document with new file info
  const { data: updatedDoc, error: updateError } = await supabase
    .from('documents')
    .update({
      file_path: validated.filePath,
      file_size: validated.fileSize,
      file_type: validated.fileType,
      version: existingDoc.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.documentId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating document:', updateError)
    throw new Error('Kunde inte uppdatera dokumentet')
  }

  revalidatePath(`/dashboard/projects/${existingDoc.project_id}/documents`)
  return updatedDoc
}
