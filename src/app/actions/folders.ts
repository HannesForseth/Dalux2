'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyProjectMembership } from '@/lib/auth-helpers'

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

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(projectId, user.id)
    if (!hasAccess) {
      console.error('getProjectFolders: User not a member of project')
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

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(projectId, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
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

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(projectId, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
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

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(existing.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
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

export async function deleteFolderById(folderId: string): Promise<void> {
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

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(folder.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
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

// Delete folder by project ID and path (used by UI which passes path)
export async function deleteFolder(projectId: string, path: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(projectId, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Normalize path
  let normalizedPath = path
  if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath
  if (!normalizedPath.endsWith('/')) normalizedPath = normalizedPath + '/'

  // Get folder info
  const { data: folder } = await supabase
    .from('folders')
    .select('id')
    .eq('project_id', projectId)
    .eq('path', normalizedPath)
    .single()

  if (!folder) {
    throw new Error('Mappen hittades inte')
  }

  // Check if there are documents in this folder
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .eq('project_id', projectId)
    .eq('folder_path', normalizedPath)
    .limit(1)

  if (docs && docs.length > 0) {
    throw new Error('Mappen innehåller dokument och kan inte raderas')
  }

  // Check if there are subfolders
  const { data: subfolders } = await supabase
    .from('folders')
    .select('id')
    .eq('project_id', projectId)
    .eq('parent_path', normalizedPath)
    .limit(1)

  if (subfolders && subfolders.length > 0) {
    throw new Error('Mappen innehåller undermappar och kan inte raderas')
  }

  // Delete folder
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folder.id)

  if (error) {
    console.error('Error deleting folder:', error)
    throw new Error('Kunde inte radera mappen')
  }

  revalidatePath(`/dashboard/projects/${projectId}/documents`)
}

// Rename folder by project ID and path
export async function renameFolder(projectId: string, path: string, newName: string): Promise<Folder> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(projectId, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Normalize path
  let normalizedPath = path
  if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath
  if (!normalizedPath.endsWith('/')) normalizedPath = normalizedPath + '/'

  // Get existing folder
  const { data: existing } = await supabase
    .from('folders')
    .select('*')
    .eq('project_id', projectId)
    .eq('path', normalizedPath)
    .single()

  if (!existing) {
    throw new Error('Mappen hittades inte')
  }

  // Calculate new path
  const newPath = existing.parent_path + newName + '/'

  // Check if new path already exists
  const { data: existingWithNewPath } = await supabase
    .from('folders')
    .select('id')
    .eq('project_id', projectId)
    .eq('path', newPath)
    .single()

  if (existingWithNewPath) {
    throw new Error('En mapp med detta namn finns redan')
  }

  // Update folder
  const { data: folder, error } = await supabase
    .from('folders')
    .update({
      name: newName,
      path: newPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    console.error('Error renaming folder:', error)
    throw new Error('Kunde inte byta namn på mappen')
  }

  // Also update any documents that are in this folder
  const { error: docsError } = await supabase
    .from('documents')
    .update({ folder_path: newPath })
    .eq('project_id', projectId)
    .eq('folder_path', normalizedPath)

  if (docsError) {
    console.error('Error updating documents folder_path:', docsError)
    // Don't throw - the folder was renamed, just documents might need manual fix
  }

  // Also update subfolders' parent_path and their paths
  const { data: subfolders } = await supabase
    .from('folders')
    .select('*')
    .eq('project_id', projectId)
    .like('path', `${normalizedPath}%`)

  if (subfolders && subfolders.length > 0) {
    for (const subfolder of subfolders) {
      const newSubfolderPath = subfolder.path.replace(normalizedPath, newPath)
      const newSubfolderParentPath = subfolder.parent_path === normalizedPath
        ? newPath
        : subfolder.parent_path.replace(normalizedPath, newPath)

      await supabase
        .from('folders')
        .update({
          path: newSubfolderPath,
          parent_path: newSubfolderParentPath,
        })
        .eq('id', subfolder.id)

      // Update documents in subfolder
      await supabase
        .from('documents')
        .update({ folder_path: newSubfolderPath })
        .eq('project_id', projectId)
        .eq('folder_path', subfolder.path)
    }
  }

  revalidatePath(`/dashboard/projects/${projectId}/documents`)
  return folder
}

export async function getAllFolderPaths(projectId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return ['/']
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(projectId, user.id)
    if (!hasAccess) {
      console.error('getAllFolderPaths: User not a member of project')
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
