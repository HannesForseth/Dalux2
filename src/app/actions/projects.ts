'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectWithMembers,
  ProjectMemberWithDetails
} from '@/types/database'

export async function getMyProjects(): Promise<Project[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    throw new Error('Kunde inte hämta projekt')
  }

  return data || []
}

export async function getProject(projectId: string): Promise<Project | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching project:', error)
    throw new Error('Kunde inte hämta projekt')
  }

  return data
}

export async function getProjectWithMembers(projectId: string): Promise<ProjectWithMembers | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError) {
    if (projectError.code === 'PGRST116') {
      return null
    }
    throw new Error('Kunde inte hämta projekt')
  }

  // Get members with their profiles and roles
  // Use !inner join hint with foreign key name to disambiguate
  // (project_members has two FKs to profiles: user_id and invited_by)
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles!project_members_user_id_fkey(*),
      role:project_roles(*)
    `)
    .eq('project_id', projectId)
    .eq('status', 'active')

  if (membersError) {
    console.error('Error fetching members:', membersError)
    throw new Error('Kunde inte hämta medlemmar')
  }

  return {
    ...project,
    members: members as ProjectMemberWithDetails[]
  }
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      ...data,
      created_by: user.id,
    })
    .select()
    .single()

  if (projectError) {
    console.error('Error creating project:', projectError)
    throw new Error('Kunde inte skapa projekt')
  }

  // Get the owner role
  const { data: ownerRole, error: roleError } = await supabase
    .from('project_roles')
    .select('id')
    .eq('name', 'owner')
    .single()

  if (roleError || !ownerRole) {
    // Rollback project creation
    await supabase.from('projects').delete().eq('id', project.id)
    throw new Error('Kunde inte hitta ägarrollen')
  }

  // Add creator as project owner
  const { error: memberError } = await supabase
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: user.id,
      role_id: ownerRole.id,
      invited_by: user.id,
      joined_at: new Date().toISOString(),
      status: 'active',
    })

  if (memberError) {
    // Rollback project creation
    await supabase.from('projects').delete().eq('id', project.id)
    console.error('Error adding owner as member:', memberError)
    throw new Error('Kunde inte lägga till ägare som medlem')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/projects')

  return project
}

export async function updateProject(
  projectId: string,
  data: UpdateProjectData
): Promise<Project> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error)
    throw new Error('Kunde inte uppdatera projekt')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)

  return project
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('Error deleting project:', error)
    throw new Error('Kunde inte radera projekt')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/projects')
}

export async function getUserRoleInProject(projectId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // Use explicit FK name to avoid ambiguity
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      role_id,
      project_roles!project_members_role_id_fkey(name)
    `)
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.project_roles?.name || null
}
