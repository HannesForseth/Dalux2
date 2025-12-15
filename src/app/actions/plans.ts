'use server'

import { createClient } from '@/lib/supabase/server'
import type { ProjectPlan, StorageAddon } from '@/types/database'

export async function getPlans(): Promise<ProjectPlan[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching plans:', error)
    throw new Error('Kunde inte hämta prisplaner')
  }

  return data as ProjectPlan[]
}

export async function getPlan(planId: string): Promise<ProjectPlan | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching plan:', error)
    throw new Error('Kunde inte hämta prisplan')
  }

  return data as ProjectPlan
}

export async function getPlanByName(name: string): Promise<ProjectPlan | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_plans')
    .select('*')
    .eq('name', name)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching plan:', error)
    throw new Error('Kunde inte hämta prisplan')
  }

  return data as ProjectPlan
}

export async function getStorageAddons(): Promise<StorageAddon[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('storage_addons')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching storage addons:', error)
    throw new Error('Kunde inte hämta lagringstillägg')
  }

  return data as StorageAddon[]
}

export async function getProjectSubscription(projectId: string): Promise<{
  subscription: import('@/types/database').ProjectSubscription | null
  plan: ProjectPlan | null
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Verify access to project
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    throw new Error('Du har inte behörighet till detta projekt')
  }

  // Get subscription
  const { data: subscription, error: subError } = await supabase
    .from('project_subscriptions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (subError && subError.code !== 'PGRST116') {
    console.error('Error fetching subscription:', subError)
    throw new Error('Kunde inte hämta prenumeration')
  }

  // Get plan if subscription exists
  let plan: ProjectPlan | null = null
  if (subscription?.plan_id) {
    const { data: planData, error: planError } = await supabase
      .from('project_plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single()

    if (planError && planError.code !== 'PGRST116') {
      console.error('Error fetching plan:', planError)
    } else {
      plan = planData as ProjectPlan
    }
  }

  return {
    subscription: subscription as import('@/types/database').ProjectSubscription | null,
    plan,
  }
}

export async function calculateProjectPrice(
  planId: string,
  extraUsers: number = 0,
  storageAddonIds: string[] = []
): Promise<{
  basePrice: number
  extraUsersPrice: number
  storagePrice: number
  totalPrice: number
  breakdown: string[]
}> {
  const supabase = await createClient()

  // Get plan
  const { data: plan, error: planError } = await supabase
    .from('project_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    throw new Error('Kunde inte hitta prisplan')
  }

  const breakdown: string[] = []

  // Base price
  const basePrice = plan.base_price_monthly
  if (basePrice > 0) {
    breakdown.push(`${plan.display_name}: ${(basePrice / 100).toLocaleString('sv-SE')} kr`)
  } else {
    breakdown.push(`${plan.display_name}: Gratis`)
  }

  // Extra users price
  let extraUsersPrice = 0
  if (extraUsers > 0 && plan.extra_user_price > 0) {
    extraUsersPrice = extraUsers * plan.extra_user_price
    breakdown.push(`${extraUsers} extra användare × ${(plan.extra_user_price / 100)} kr = ${(extraUsersPrice / 100).toLocaleString('sv-SE')} kr`)
  }

  // Storage addons price
  let storagePrice = 0
  if (storageAddonIds.length > 0) {
    const { data: addons } = await supabase
      .from('storage_addons')
      .select('*')
      .in('id', storageAddonIds)

    if (addons) {
      for (const addon of addons) {
        storagePrice += addon.price_monthly
        breakdown.push(`${addon.display_name}: ${(addon.price_monthly / 100).toLocaleString('sv-SE')} kr`)
      }
    }
  }

  const totalPrice = basePrice + extraUsersPrice + storagePrice

  return {
    basePrice,
    extraUsersPrice,
    storagePrice,
    totalPrice,
    breakdown,
  }
}
