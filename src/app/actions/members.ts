'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendInvitationEmail } from '@/lib/email'
import { verifyProjectMembership } from '@/lib/auth-helpers'
import {
  uuidSchema,
  emailSchema,
  validateInput
} from '@/lib/validations'
import { z } from 'zod'
import type {
  ProjectMember,
  ProjectMemberWithDetails,
  InviteMemberData,
  Invitation,
  InvitationWithDetails,
  ProjectRole
} from '@/types/database'

// Local validation schemas
const inviteMemberInputSchema = z.object({
  email: emailSchema,
  role_id: uuidSchema,
  company_id: uuidSchema.optional().nullable(),
})

const updateMemberRoleInputSchema = z.object({
  projectId: uuidSchema,
  userId: uuidSchema,
  roleId: uuidSchema,
})

const removeMemberInputSchema = z.object({
  projectId: uuidSchema,
  userId: uuidSchema,
})

const tokenSchema = z.string().min(1, 'Token krävs')

export async function getProjectMembers(projectId: string): Promise<ProjectMemberWithDetails[]> {
  try {
    // Validate input
    const validatedId = validateInput(uuidSchema, projectId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectMembers: User not authenticated')
      return []
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedId, user.id)
    if (!hasAccess) {
      console.error('getProjectMembers: User not a member of project')
      return []
    }

    // Use explicit FK name to disambiguate (project_members has two FKs to profiles: user_id and invited_by)
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profile:profiles!project_members_user_id_fkey(*),
        role:project_roles(*),
        group:project_groups(*)
      `)
      .eq('project_id', validatedId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching members:', error)
      return []
    }

    return data as ProjectMemberWithDetails[]
  } catch (err) {
    console.error('getProjectMembers unexpected error:', err)
    return []
  }
}

export async function getProjectRoles(): Promise<ProjectRole[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching roles:', error)
      return []
    }

    return data
  } catch (err) {
    console.error('getProjectRoles unexpected error:', err)
    return []
  }
}

export async function inviteMember(
  projectId: string,
  data: InviteMemberData
): Promise<{ type: 'added' | 'invited'; member?: ProjectMember; invitation?: Invitation }> {
  // Validate input
  const validatedProjectId = validateInput(uuidSchema, projectId)
  const validatedData = validateInput(inviteMemberInputSchema, data)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(validatedProjectId, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Check if user with this email already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', (
      await supabase.rpc('get_user_id_by_email', { email_input: validatedData.email })
    ).data)
    .single()

  // Try to find user by email in auth.users (via a function or direct query)
  const { data: authUser } = await supabase
    .rpc('get_user_id_by_email', { email_input: validatedData.email })

  if (authUser) {
    // User exists - check if already a member
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id, status')
      .eq('project_id', validatedProjectId)
      .eq('user_id', authUser)
      .single()

    if (existingMember) {
      if (existingMember.status === 'active') {
        throw new Error('Användaren är redan medlem i projektet')
      }
      // Reactivate removed member
      const { data: member, error } = await supabase
        .from('project_members')
        .update({
          role_id: validatedData.role_id,
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id)
        .select()
        .single()

      if (error) throw new Error('Kunde inte återaktivera medlem')

      revalidatePath(`/dashboard/projects/${validatedProjectId}`)
      return { type: 'added', member }
    }

    // Add user directly as member
    const { data: member, error } = await supabase
      .from('project_members')
      .insert({
        project_id: validatedProjectId,
        user_id: authUser,
        role_id: validatedData.role_id,
        invited_by: user.id,
        joined_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding member:', error)
      throw new Error('Kunde inte lägga till medlem')
    }

    revalidatePath(`/dashboard/projects/${validatedProjectId}`)
    return { type: 'added', member }
  }

  // User doesn't exist - create invitation
  // First check for existing pending invitation
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id')
    .eq('project_id', validatedProjectId)
    .eq('email', validatedData.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvitation) {
    throw new Error('Det finns redan en väntande inbjudan för denna e-postadress')
  }

  // Get project name and role name for the email
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', validatedProjectId)
    .single()

  const { data: role } = await supabase
    .from('project_roles')
    .select('display_name')
    .eq('id', validatedData.role_id)
    .single()

  // Get inviter's profile name
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      email: validatedData.email,
      project_id: validatedProjectId,
      role_id: validatedData.role_id,
      company_id: validatedData.company_id || null,
      invited_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating invitation:', error)
    throw new Error('Kunde inte skapa inbjudan')
  }

  // Send invitation email
  try {
    await sendInvitationEmail({
      to: validatedData.email,
      token: invitation.token,
      projectName: project?.name || 'Projekt',
      inviterName: inviterProfile?.full_name || user.email || 'En kollega',
      roleName: role?.display_name || 'Medlem',
    })
  } catch (emailError) {
    console.error('Failed to send invitation email:', emailError)
    // Don't fail the invitation if email fails - it's still valid
    // The user can copy the invite link manually
  }

  revalidatePath(`/dashboard/projects/${validatedProjectId}`)
  return { type: 'invited', invitation }
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  // Validate input
  const validated = validateInput(removeMemberInputSchema, { projectId, userId })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(validated.projectId, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Can't remove yourself
  if (validated.userId === user.id) {
    throw new Error('Du kan inte ta bort dig själv från projektet')
  }

  // Check if trying to remove the owner (use explicit FK name)
  const { data: targetMember } = await supabase
    .from('project_members')
    .select(`
      role_id,
      project_roles!project_members_role_id_fkey(name)
    `)
    .eq('project_id', validated.projectId)
    .eq('user_id', validated.userId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetRoleName = (targetMember as any)?.project_roles?.name
  if (targetRoleName === 'owner') {
    throw new Error('Du kan inte ta bort projektägaren')
  }

  const { error } = await supabase
    .from('project_members')
    .update({ status: 'removed' })
    .eq('project_id', validated.projectId)
    .eq('user_id', validated.userId)

  if (error) {
    console.error('Error removing member:', error)
    throw new Error('Kunde inte ta bort medlem')
  }

  revalidatePath(`/dashboard/projects/${validated.projectId}`)
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  roleId: string
): Promise<void> {
  // Validate input
  const validated = validateInput(updateMemberRoleInputSchema, { projectId, userId, roleId })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(validated.projectId, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  // Can't change your own role
  if (validated.userId === user.id) {
    throw new Error('Du kan inte ändra din egen roll')
  }

  // Check if trying to change owner's role (use explicit FK name)
  const { data: targetMember } = await supabase
    .from('project_members')
    .select(`
      role_id,
      project_roles!project_members_role_id_fkey(name)
    `)
    .eq('project_id', validated.projectId)
    .eq('user_id', validated.userId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberRoleName = (targetMember as any)?.project_roles?.name
  if (memberRoleName === 'owner') {
    throw new Error('Du kan inte ändra projektägarens roll')
  }

  // Can't assign owner role
  const { data: newRole } = await supabase
    .from('project_roles')
    .select('name')
    .eq('id', validated.roleId)
    .single()

  if (newRole?.name === 'owner') {
    throw new Error('Du kan inte tilldela ägarrollen')
  }

  const { error } = await supabase
    .from('project_members')
    .update({ role_id: validated.roleId })
    .eq('project_id', validated.projectId)
    .eq('user_id', validated.userId)

  if (error) {
    console.error('Error updating member role:', error)
    throw new Error('Kunde inte uppdatera roll')
  }

  revalidatePath(`/dashboard/projects/${validated.projectId}`)
}

export async function getProjectInvitations(projectId: string): Promise<InvitationWithDetails[]> {
  try {
    // Validate input
    const validatedId = validateInput(uuidSchema, projectId)

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProjectInvitations: User not authenticated')
      return []
    }

    // Verify user has access to project
    const hasAccess = await verifyProjectMembership(validatedId, user.id)
    if (!hasAccess) {
      console.error('getProjectInvitations: User not a member of project')
      return []
    }

    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        project:projects(*),
        role:project_roles(*),
        inviter:profiles!invitations_invited_by_fkey(*)
      `)
      .eq('project_id', validatedId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return []
    }

    return data as InvitationWithDetails[]
  } catch (err) {
    console.error('getProjectInvitations unexpected error:', err)
    return []
  }
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  // Validate input
  const validatedId = validateInput(uuidSchema, invitationId)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: invitation } = await supabase
    .from('invitations')
    .select('project_id')
    .eq('id', validatedId)
    .single()

  if (!invitation) {
    throw new Error('Inbjudan hittades inte')
  }

  // Verify user has access to project
  const hasAccess = await verifyProjectMembership(invitation.project_id, user.id)
  if (!hasAccess) {
    throw new Error('Du har inte tillgång till detta projekt')
  }

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', validatedId)

  if (error) {
    console.error('Error canceling invitation:', error)
    throw new Error('Kunde inte avbryta inbjudan')
  }

  revalidatePath(`/dashboard/projects/${invitation.project_id}`)
}

export async function getInvitationByToken(token: string): Promise<InvitationWithDetails | null> {
  try {
    // Validate input
    const validatedToken = validateInput(tokenSchema, token)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        project:projects(*),
        role:project_roles(*),
        inviter:profiles!invitations_invited_by_fkey(*)
      `)
      .eq('token', validatedToken)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error) {
      console.error('Error fetching invitation:', error)
      return null
    }

    if (!data) {
      return null
    }

    return data as InvitationWithDetails
  } catch (err) {
    console.error('getInvitationByToken unexpected error:', err)
    return null
  }
}

export async function acceptInvitation(token: string): Promise<{ projectId: string }> {
  // Validate input
  const validatedToken = validateInput(tokenSchema, token)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Du måste vara inloggad för att acceptera inbjudan')
  }

  // Get the invitation
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', validatedToken)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (invError || !invitation) {
    throw new Error('Inbjudan är ogiltig eller har gått ut')
  }

  // Check if user email matches invitation email
  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('Denna inbjudan är för en annan e-postadress')
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('project_members')
    .select('id, status')
    .eq('project_id', invitation.project_id)
    .eq('user_id', user.id)
    .single()

  if (existingMember?.status === 'active') {
    // Mark invitation as accepted anyway
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return { projectId: invitation.project_id }
  }

  if (existingMember) {
    // Reactivate
    await supabase
      .from('project_members')
      .update({
        role_id: invitation.role_id,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .eq('id', existingMember.id)
  } else {
    // Add as new member
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: invitation.project_id,
        user_id: user.id,
        role_id: invitation.role_id,
        invited_by: invitation.invited_by,
        joined_at: new Date().toISOString(),
        status: 'active',
      })

    if (memberError) {
      console.error('Error adding member from invitation:', memberError)
      throw new Error('Kunde inte lägga till dig som medlem')
    }
  }

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${invitation.project_id}`)

  return { projectId: invitation.project_id }
}
