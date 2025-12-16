'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyProjectMembership } from '@/lib/auth-helpers'
import type {
  Checklist,
  ChecklistWithDetails,
  ChecklistItem,
  CreateChecklistData,
  UpdateChecklistData,
  ChecklistStatus
} from '@/types/database'

export async function getProjectChecklists(
  projectId: string,
  status?: ChecklistStatus | 'all'
): Promise<ChecklistWithDetails[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectChecklists: User not authenticated')
      return []
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(projectId, user.id)
    if (!hasAccess) {
      console.error('getProjectChecklists: User not a member of project')
      return []
    }

    let query = supabase
      .from('checklists')
      .select(`
        *,
        creator:profiles!checklists_created_by_fkey(*),
        completer:profiles!checklists_completed_by_fkey(*),
        items:checklist_items(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching checklists:', error)
      return []
    }

    return data as ChecklistWithDetails[]
  } catch (err) {
    console.error('getProjectChecklists unexpected error:', err)
    return []
  }
}

export async function getChecklist(checklistId: string): Promise<ChecklistWithDetails | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getChecklist: User not authenticated')
      return null
    }

    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        creator:profiles!checklists_created_by_fkey(*),
        completer:profiles!checklists_completed_by_fkey(*),
        items:checklist_items(*)
      `)
      .eq('id', checklistId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching checklist:', error)
      return null
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(data.project_id, user.id)
    if (!hasAccess) {
      console.error('getChecklist: User not a member of project')
      return null
    }

    // Sort items by sort_order
    if (data.items) {
      data.items.sort((a: ChecklistItem, b: ChecklistItem) => a.sort_order - b.sort_order)
    }

    return data as ChecklistWithDetails
  } catch (err) {
    console.error('getChecklist unexpected error:', err)
    return null
  }
}

export async function createChecklist(
  projectId: string,
  data: CreateChecklistData,
  items?: { title: string; description?: string; is_required?: boolean }[]
): Promise<Checklist> {
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

  // Create the checklist
  const { data: checklist, error } = await supabase
    .from('checklists')
    .insert({
      project_id: projectId,
      name: data.name,
      description: data.description || null,
      status: data.status || 'draft',
      location: data.location || null,
      due_date: data.due_date || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating checklist:', error)
    throw new Error('Kunde inte skapa checklistan')
  }

  // Create initial items if provided
  if (items && items.length > 0) {
    const itemsToInsert = items.map((item, index) => ({
      checklist_id: checklist.id,
      title: item.title,
      description: item.description || null,
      is_required: item.is_required || false,
      sort_order: index,
    }))

    const { error: itemsError } = await supabase
      .from('checklist_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating checklist items:', itemsError)
      // Continue without failing - items can be added later
    }
  }

  revalidatePath(`/dashboard/projects/${projectId}/checklists`)
  return checklist
}

export async function updateChecklist(
  checklistId: string,
  data: UpdateChecklistData
): Promise<Checklist> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get existing checklist
  const { data: existing } = await supabase
    .from('checklists')
    .select('project_id, status')
    .eq('id', checklistId)
    .single()

  if (!existing) {
    throw new Error('Checklistan hittades inte')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(existing.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // If status is changing to completed, set completed_by and completed_at
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  if (data.status === 'completed' && existing.status !== 'completed') {
    updateData.completed_by = user.id
    updateData.completed_at = new Date().toISOString()
  } else if (data.status && data.status !== 'completed' && data.status !== 'approved') {
    updateData.completed_by = null
    updateData.completed_at = null
  }

  const { data: checklist, error } = await supabase
    .from('checklists')
    .update(updateData)
    .eq('id', checklistId)
    .select()
    .single()

  if (error) {
    console.error('Error updating checklist:', error)
    throw new Error('Kunde inte uppdatera checklistan')
  }

  revalidatePath(`/dashboard/projects/${existing.project_id}/checklists`)
  return checklist
}

export async function deleteChecklist(checklistId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get checklist info
  const { data: checklist } = await supabase
    .from('checklists')
    .select('project_id')
    .eq('id', checklistId)
    .single()

  if (!checklist) {
    throw new Error('Checklistan hittades inte')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(checklist.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Delete the checklist (cascade will delete items)
  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('id', checklistId)

  if (error) {
    console.error('Error deleting checklist:', error)
    throw new Error('Kunde inte radera checklistan')
  }

  revalidatePath(`/dashboard/projects/${checklist.project_id}/checklists`)
}

// Checklist Items
export async function addChecklistItem(
  checklistId: string,
  item: { title: string; description?: string; is_required?: boolean }
): Promise<ChecklistItem> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get checklist to verify project access
  const { data: checklist } = await supabase
    .from('checklists')
    .select('project_id')
    .eq('id', checklistId)
    .single()

  if (!checklist) {
    throw new Error('Checklistan hittades inte')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(checklist.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Get the current max sort_order
  const { data: existingItems } = await supabase
    .from('checklist_items')
    .select('sort_order')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existingItems && existingItems.length > 0
    ? existingItems[0].sort_order + 1
    : 0

  const { data: newItem, error } = await supabase
    .from('checklist_items')
    .insert({
      checklist_id: checklistId,
      title: item.title,
      description: item.description || null,
      is_required: item.is_required || false,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding checklist item:', error)
    throw new Error('Kunde inte lägga till punkten')
  }

  return newItem
}

export async function updateChecklistItem(
  itemId: string,
  data: { title?: string; description?: string; is_required?: boolean }
): Promise<ChecklistItem> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get item with checklist to verify project access
  const { data: existingItem } = await supabase
    .from('checklist_items')
    .select('checklist_id, checklists!inner(project_id)')
    .eq('id', itemId)
    .single()

  if (!existingItem) {
    throw new Error('Punkten hittades inte')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectId = (existingItem.checklists as any)?.project_id
  if (projectId) {
    const hasAccess = await verifyProjectMembership(projectId, user.id)
    if (!hasAccess) {
      throw new Error('Du har inte tillgång till detta projekt')
    }
  }

  const { data: item, error } = await supabase
    .from('checklist_items')
    .update(data)
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    console.error('Error updating checklist item:', error)
    throw new Error('Kunde inte uppdatera punkten')
  }

  return item
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get item with checklist to verify project access
  const { data: existingItem } = await supabase
    .from('checklist_items')
    .select('checklist_id, checklists!inner(project_id)')
    .eq('id', itemId)
    .single()

  if (!existingItem) {
    throw new Error('Punkten hittades inte')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectId = (existingItem.checklists as any)?.project_id
  if (projectId) {
    const hasAccess = await verifyProjectMembership(projectId, user.id)
    if (!hasAccess) {
      throw new Error('Du har inte tillgång till detta projekt')
    }
  }

  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting checklist item:', error)
    throw new Error('Kunde inte radera punkten')
  }
}

export async function toggleChecklistItem(itemId: string): Promise<ChecklistItem> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get current item state with checklist to verify project access
  const { data: current } = await supabase
    .from('checklist_items')
    .select('is_checked, checklists!inner(project_id)')
    .eq('id', itemId)
    .single()

  if (!current) {
    throw new Error('Punkten hittades inte')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectId = (current.checklists as any)?.project_id
  if (projectId) {
    const hasAccess = await verifyProjectMembership(projectId, user.id)
    if (!hasAccess) {
      throw new Error('Du har inte tillgång till detta projekt')
    }
  }

  const newCheckedState = !current.is_checked

  const { data: item, error } = await supabase
    .from('checklist_items')
    .update({
      is_checked: newCheckedState,
      checked_by: newCheckedState ? user.id : null,
      checked_at: newCheckedState ? new Date().toISOString() : null,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    console.error('Error toggling checklist item:', error)
    throw new Error('Kunde inte uppdatera punkten')
  }

  return item
}

export async function reorderChecklistItems(
  checklistId: string,
  itemIds: string[]
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get checklist to verify project access
  const { data: checklist } = await supabase
    .from('checklists')
    .select('project_id')
    .eq('id', checklistId)
    .single()

  if (!checklist) {
    throw new Error('Checklistan hittades inte')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(checklist.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Update sort_order for each item
  const updates = itemIds.map((id, index) =>
    supabase
      .from('checklist_items')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('checklist_id', checklistId)
  )

  await Promise.all(updates)
}

// Stats
export async function getChecklistStats(projectId: string): Promise<{
  total: number
  draft: number
  inProgress: number
  completed: number
  approved: number
}> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { total: 0, draft: 0, inProgress: 0, completed: 0, approved: 0 }
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(projectId, user.id)
    if (!hasAccess) {
      console.error('getChecklistStats: User not a member of project')
      return { total: 0, draft: 0, inProgress: 0, completed: 0, approved: 0 }
    }

    const { data, error } = await supabase
      .from('checklists')
      .select('status')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching checklist stats:', error)
      return { total: 0, draft: 0, inProgress: 0, completed: 0, approved: 0 }
    }

    return {
      total: data?.length || 0,
      draft: data?.filter(c => c.status === 'draft').length || 0,
      inProgress: data?.filter(c => c.status === 'in_progress').length || 0,
      completed: data?.filter(c => c.status === 'completed').length || 0,
      approved: data?.filter(c => c.status === 'approved').length || 0,
    }
  } catch (err) {
    console.error('getChecklistStats unexpected error:', err)
    return { total: 0, draft: 0, inProgress: 0, completed: 0, approved: 0 }
  }
}
