'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProjectGroup, ProjectMemberWithDetails } from '@/types/database'

/**
 * Get all groups for a project
 */
export async function getProjectGroups(projectId: string): Promise<ProjectGroup[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('project_groups')
    .select('*')
    .eq('project_id', projectId)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) {
    console.error('Error fetching groups:', error)
    throw new Error('Kunde inte hämta grupper')
  }

  return data || []
}

/**
 * Get groups with member count
 */
export async function getProjectGroupsWithCounts(projectId: string): Promise<(ProjectGroup & { member_count: number })[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Fetch groups
  const { data: groups, error: groupsError } = await supabase
    .from('project_groups')
    .select('*')
    .eq('project_id', projectId)
    .order('is_default', { ascending: false })
    .order('name')

  if (groupsError) {
    console.error('Error fetching groups:', groupsError)
    throw new Error('Kunde inte hämta grupper')
  }

  // Fetch member counts per group
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select('group_id')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .not('group_id', 'is', null)

  if (membersError) {
    console.error('Error fetching member counts:', membersError)
  }

  // Count members per group
  const countMap = new Map<string, number>()
  for (const member of members || []) {
    if (member.group_id) {
      countMap.set(member.group_id, (countMap.get(member.group_id) || 0) + 1)
    }
  }

  return (groups || []).map(group => ({
    ...group,
    member_count: countMap.get(group.id) || 0
  }))
}

/**
 * Create a custom group
 */
export async function createProjectGroup(
  projectId: string,
  data: {
    name: string
    description?: string
    color?: string
  }
): Promise<ProjectGroup> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Check if user is admin/owner
  const { data: membership } = await supabase
    .from('project_members')
    .select('role:project_roles(name)')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleName = (membership?.role as any)?.name as string | undefined
  if (!roleName || !['owner', 'admin'].includes(roleName)) {
    throw new Error('Du har inte behörighet att skapa grupper')
  }

  const { data: group, error } = await supabase
    .from('project_groups')
    .insert({
      project_id: projectId,
      name: data.name,
      description: data.description || null,
      color: data.color || '#6366f1',
      is_default: false,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('En grupp med detta namn finns redan')
    }
    console.error('Error creating group:', error)
    throw new Error('Kunde inte skapa grupp')
  }

  revalidatePath(`/dashboard/projects/${projectId}/settings`)
  return group
}

/**
 * Update a group (only custom groups, not default)
 */
export async function updateProjectGroup(
  groupId: string,
  data: {
    name?: string
    description?: string | null
    color?: string
  }
): Promise<ProjectGroup> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get group to check ownership and if it's a default group
  const { data: existing, error: fetchError } = await supabase
    .from('project_groups')
    .select('project_id, is_default')
    .eq('id', groupId)
    .single()

  if (fetchError || !existing) {
    throw new Error('Grupp hittades inte')
  }

  if (existing.is_default) {
    throw new Error('Standardgrupper kan inte redigeras')
  }

  // Check if user is admin/owner
  const { data: membership } = await supabase
    .from('project_members')
    .select('role:project_roles(name)')
    .eq('project_id', existing.project_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleName = (membership?.role as any)?.name as string | undefined
  if (!roleName || !['owner', 'admin'].includes(roleName)) {
    throw new Error('Du har inte behörighet att redigera grupper')
  }

  const { data: group, error } = await supabase
    .from('project_groups')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', groupId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('En grupp med detta namn finns redan')
    }
    console.error('Error updating group:', error)
    throw new Error('Kunde inte uppdatera grupp')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/settings`)
  return group
}

/**
 * Delete a custom group (only custom groups, not default)
 */
export async function deleteProjectGroup(groupId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get group to check ownership and if it's a default group
  const { data: existing, error: fetchError } = await supabase
    .from('project_groups')
    .select('project_id, is_default')
    .eq('id', groupId)
    .single()

  if (fetchError || !existing) {
    throw new Error('Grupp hittades inte')
  }

  if (existing.is_default) {
    throw new Error('Standardgrupper kan inte tas bort')
  }

  // Check if user is admin/owner
  const { data: membership } = await supabase
    .from('project_members')
    .select('role:project_roles(name)')
    .eq('project_id', existing.project_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleName = (membership?.role as any)?.name as string | undefined
  if (!roleName || !['owner', 'admin'].includes(roleName)) {
    throw new Error('Du har inte behörighet att ta bort grupper')
  }

  const { error } = await supabase
    .from('project_groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    console.error('Error deleting group:', error)
    throw new Error('Kunde inte ta bort grupp')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/settings`)
}

/**
 * Assign a member to a group
 */
export async function assignMemberToGroup(
  projectId: string,
  userId: string,
  groupId: string | null
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Check if user is admin/owner
  const { data: membership } = await supabase
    .from('project_members')
    .select('role:project_roles(name)')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleName = (membership?.role as any)?.name as string | undefined
  if (!roleName || !['owner', 'admin'].includes(roleName)) {
    throw new Error('Du har inte behörighet att tilldela grupper')
  }

  // Verify the group belongs to this project (if groupId is provided)
  if (groupId) {
    const { data: group } = await supabase
      .from('project_groups')
      .select('id')
      .eq('id', groupId)
      .eq('project_id', projectId)
      .single()

    if (!group) {
      throw new Error('Gruppen hittades inte i detta projekt')
    }
  }

  const { error } = await supabase
    .from('project_members')
    .update({ group_id: groupId })
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error assigning member to group:', error)
    throw new Error('Kunde inte tilldela grupp')
  }

  revalidatePath(`/dashboard/projects/${projectId}/settings`)
}

/**
 * Get all members in a specific group
 */
export async function getGroupMembers(groupId: string): Promise<ProjectMemberWithDetails[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles(*),
      role:project_roles(*),
      group:project_groups(*)
    `)
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('joined_at')

  if (error) {
    console.error('Error fetching group members:', error)
    throw new Error('Kunde inte hämta gruppmedlemmar')
  }

  return data as unknown as ProjectMemberWithDetails[]
}

/**
 * Get all user IDs in a group (for notifications)
 */
export async function getGroupUserIds(groupId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching group user IDs:', error)
    return []
  }

  return data.map(m => m.user_id)
}
