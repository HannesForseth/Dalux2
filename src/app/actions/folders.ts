'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Folder {
  id: string
  project_id: string
  name: string
  path: string
  parent_path: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateFolderData {
  name: string
  path: string
  parent_path: string
  description?: string
}

export async function getProjectFolders(projectId: string): Promise<Folder[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectFolders: User not authenticated')
      return []
    }

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('project_id', projectId)
      .order('path', { ascending: true })

    if (error) {
      console.error('Error fetching folders:', error)
      return []
    }

    return data as Folder[]
  } catch (err) {
    console.error('getProjectFolders unexpected error:', err)
    return []
  }
}

export async function createFolder(
  projectId: string,
  data: CreateFolderData
): Promise<Folder> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Normalize path - ensure it starts and ends with /
  let normalizedPath = data.path
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath
  }
  if (!normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath + '/'
  }

  let normalizedParentPath = data.parent_path
  if (!normalizedParentPath.startsWith('/')) {
    normalizedParentPath = '/' + normalizedParentPath
  }
  if (!normalizedParentPath.endsWith('/')) {
    normalizedParentPath = normalizedParentPath + '/'
  }

  const { data: folder, error } = await supabase
    .from('folders')
    .insert({
      project_id: projectId,
      name: data.name,
      path: normalizedPath,
      parent_path: normalizedParentPath,
      description: data.description || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('En mapp med detta namn finns redan')
    }
    console.error('Error creating folder:', error)
    throw new Error('Kunde inte skapa mappen')
  }

  revalidatePath(`/dashboard/projects/${projectId}/documents`)
  return folder
}

export async function createMultipleFolders(
  projectId: string,
  folders: CreateFolderData[]
): Promise<Folder[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Normalize all paths and prepare for insert
  const foldersToInsert = folders.map(f => {
    let normalizedPath = f.path
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath
    }
    if (!normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath + '/'
    }

    let normalizedParentPath = f.parent_path
    if (!normalizedParentPath.startsWith('/')) {
      normalizedParentPath = '/' + normalizedParentPath
    }
    if (!normalizedParentPath.endsWith('/')) {
      normalizedParentPath = normalizedParentPath + '/'
    }

    return {
      project_id: projectId,
      name: f.name,
      path: normalizedPath,
      parent_path: normalizedParentPath,
      description: f.description || null,
      created_by: user.id,
    }
  })

  // Use upsert to avoid duplicates
  const { data, error } = await supabase
    .from('folders')
    .upsert(foldersToInsert, {
      onConflict: 'project_id,path',
      ignoreDuplicates: true
    })
    .select()

  if (error) {
    console.error('Error creating folders:', error)
    throw new Error('Kunde inte skapa mapparna')
  }

  revalidatePath(`/dashboard/projects/${projectId}/documents`)
  return data as Folder[]
}

export async function updateFolder(
  folderId: string,
  data: { name?: string; description?: string }
): Promise<Folder> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing folder
  const { data: existing } = await supabase
    .from('folders')
    .select('*')
    .eq('id', folderId)
    .single()

  if (!existing) {
    throw new Error('Mappen hittades inte')
  }

  // If name is changing, we need to update the path
  let updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.name && data.name !== existing.name) {
    // Calculate new path
    const newPath = existing.parent_path + data.name + '/'
    updateData.name = data.name
    updateData.path = newPath

    // Also need to update all child folders' paths
    // This is complex - for now just update the folder name
  }

  if (data.description !== undefined) {
    updateData.description = data.description
  }

  const { data: folder, error } = await supabase
    .from('folders')
    .update(updateData)
    .eq('id', folderId)
    .select()
    .single()

  if (error) {
    console.error('Error updating folder:', error)
    throw new Error('Kunde inte uppdatera mappen')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  return folder
}

export async function deleteFolder(folderId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get folder info
  const { data: folder } = await supabase
    .from('folders')
    .select('project_id, path')
    .eq('id', folderId)
    .single()

  if (!folder) {
    throw new Error('Mappen hittades inte')
  }

  // Check if there are documents in this folder
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .eq('project_id', folder.project_id)
    .eq('folder_path', folder.path)
    .limit(1)

  if (docs && docs.length > 0) {
    throw new Error('Mappen innehåller dokument och kan inte raderas')
  }

  // Check if there are subfolders
  const { data: subfolders } = await supabase
    .from('folders')
    .select('id')
    .eq('project_id', folder.project_id)
    .eq('parent_path', folder.path)
    .limit(1)

  if (subfolders && subfolders.length > 0) {
    throw new Error('Mappen innehåller undermappar och kan inte raderas')
  }

  // Delete folder
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)

  if (error) {
    console.error('Error deleting folder:', error)
    throw new Error('Kunde inte radera mappen')
  }

  revalidatePath(`/dashboard/projects/${folder.project_id}/documents`)
}

export async function getAllFolderPaths(projectId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return ['/']
    }

    // Get folders from folders table
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('path')
      .eq('project_id', projectId)

    if (foldersError) {
      console.error('Error fetching folders:', foldersError)
    }

    // Also get unique folder paths from documents (for backwards compatibility)
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('folder_path')
      .eq('project_id', projectId)

    if (docsError) {
      console.error('Error fetching document folders:', docsError)
    }

    // Combine both sources
    const pathSet = new Set<string>(['/'])

    folders?.forEach(f => pathSet.add(f.path))
    docs?.forEach(d => {
      if (d.folder_path) pathSet.add(d.folder_path)
    })

    return Array.from(pathSet).sort()
  } catch (err) {
    console.error('getAllFolderPaths unexpected error:', err)
    return ['/']
  }
}
