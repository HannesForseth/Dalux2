'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProjectMembers,
  getProjectInvitations,
  getProjectRoles,
  removeMember,
  updateMemberRole,
  cancelInvitation,
} from '@/app/actions/members'
import { getProject, getUserRoleInProject } from '@/app/actions/projects'
import type { Project, ProjectMemberWithDetails, InvitationWithDetails, ProjectRole, RoleName } from '@/types/database'
import { canManageMembers, canChangeRoles, isOwner, getRoleDisplayName, getAssignableRoles } from '@/lib/permissions'
import InviteMemberModal from '@/components/members/InviteMemberModal'

export default function MembersSettingsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMemberWithDetails[]>([])
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([])
  const [roles, setRoles] = useState<ProjectRole[]>([])
  const [userRole, setUserRole] = useState<RoleName | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      const [projectData, membersData, invitationsData, rolesData, role] = await Promise.all([
        getProject(projectId),
        getProjectMembers(projectId),
        getProjectInvitations(projectId),
        getProjectRoles(),
        getUserRoleInProject(projectId),
      ])
      setProject(projectData)
      setMembers(membersData)
      setInvitations(invitationsData)
      setRoles(rolesData)
      setUserRole(role as RoleName)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Är du säker på att du vill ta bort denna medlem?')) return

    setActionLoading(userId)
    try {
      await removeMember(projectId, userId)
      await loadData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Kunde inte ta bort medlem')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRoleChange(userId: string, roleId: string) {
    setActionLoading(userId)
    try {
      await updateMemberRole(projectId, userId, roleId)
      await loadData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Kunde inte ändra roll')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    if (!confirm('Är du säker på att du vill avbryta denna inbjudan?')) return

    setActionLoading(invitationId)
    try {
      await cancelInvitation(invitationId)
      await loadData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Kunde inte avbryta inbjudan')
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4 mb-8" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-800 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-800 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!project || !userRole) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Projektet hittades inte</h2>
        <Link href="/dashboard/projects" className="text-blue-400 hover:text-blue-300">
          Tillbaka till projekt
        </Link>
      </div>
    )
  }

  const canManage = canManageMembers(userRole)
  const canChange = canChangeRoles(userRole)
  const assignableRoleNames = getAssignableRoles(userRole)
  const assignableRoles = roles.filter((r) => assignableRoleNames.includes(r.name as RoleName))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeftIcon />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Medlemmar</h1>
          <p className="text-slate-400">{project.name}</p>
        </div>
      </div>

      {/* Invite button */}
      {canManage && (
        <div className="mb-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusIcon />
            Bjud in medlem
          </button>
        </div>
      )}

      {/* Members list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Aktiva medlemmar ({members.length})</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {members.map((member) => {
            const memberRoleName = member.role?.name as RoleName
            const isCurrentUserOwner = isOwner(userRole)
            const isMemberOwner = isOwner(memberRoleName)
            const canEditThis = canChange && !isMemberOwner && member.user_id !== params.id

            return (
              <div key={member.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">
                  {member.profile?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {member.profile?.full_name || 'Okänd användare'}
                  </p>
                  <p className="text-slate-500 text-sm truncate">
                    {member.profile?.company || 'Inget företag'}
                  </p>
                </div>

                {canEditThis ? (
                  <select
                    value={member.role_id}
                    onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                    disabled={actionLoading === member.user_id}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={member.role_id}>
                      {getRoleDisplayName(memberRoleName)}
                    </option>
                    {assignableRoles
                      .filter((r) => r.id !== member.role_id)
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {getRoleDisplayName(role.name as RoleName)}
                        </option>
                      ))}
                  </select>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-300">
                    {getRoleDisplayName(memberRoleName)}
                  </span>
                )}

                {canManage && !isMemberOwner && member.user_id !== params.id && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={actionLoading === member.user_id}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Ta bort medlem"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            )
          })}

          {members.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Inga medlemmar än
            </div>
          )}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">Väntande inbjudningar ({invitations.length})</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                  <EnvelopeIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{invitation.email}</p>
                  <p className="text-slate-500 text-sm">
                    Inbjuden {new Date(invitation.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>
                <span className="px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-300">
                  {getRoleDisplayName(invitation.role?.name as RoleName)}
                </span>
                {canManage && (
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    disabled={actionLoading === invitation.id}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Avbryt inbjudan"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        userRole={userRole}
        onSuccess={loadData}
      />
    </div>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}
