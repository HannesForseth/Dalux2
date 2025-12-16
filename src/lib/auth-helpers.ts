import { createClient } from '@/lib/supabase/server'

/**
 * Verify that a user is an active member of a project
 * @param projectId - The project ID to check
 * @param userId - The user ID to check
 * @returns true if user is an active member, false otherwise
 */
export async function verifyProjectMembership(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  return !!membership
}

/**
 * Get the current authenticated user
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Verify user is authenticated and is a member of the project
 * Returns user if authorized, throws error otherwise
 */
export async function requireProjectAccess(projectId: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Du måste vara inloggad')
  }

  const hasAccess = await verifyProjectMembership(projectId, user.id)

  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  return user
}
