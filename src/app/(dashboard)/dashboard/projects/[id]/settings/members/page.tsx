'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, X, Mail, Users, Shield, AlertTriangle } from 'lucide-react'
import {
  getProjectMembers,
  getProjectInvitations,
  getProjectRoles,
  removeMember,
  updateMemberRole,
  cancelInvitation,
} from '@/app/actions/members'
import { getProject, getUserRoleInProject, deleteProject } from '@/app/actions/projects'
import { getProjectGroups, assignMemberToGroup } from '@/app/actions/groups'
import type { Project, ProjectMemberWithDetails, InvitationWithDetails, ProjectRole, RoleName, ProjectGroup } from '@/types/database'
import { canManageMembers, canChangeRoles, canDeleteProject, isOwner, getRoleDisplayName, getAssignableRoles } from '@/lib/permissions'
import InviteMemberModal from '@/components/members/InviteMemberModal'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export default function MembersSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMemberWithDetails[]>([])
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([])
  const [roles, setRoles] = useState<ProjectRole[]>([])
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [userRole, setUserRole] = useState<RoleName | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      const [projectData, membersData, invitationsData, rolesData, groupsData, role] = await Promise.all([
        getProject(projectId),
        getProjectMembers(projectId),
        getProjectInvitations(projectId),
        getProjectRoles(),
        getProjectGroups(projectId),
        getUserRoleInProject(projectId),
      ])
      setProject(projectData)
      setMembers(membersData)
      setInvitations(invitationsData)
      setRoles(rolesData)
      setGroups(groupsData)
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

  async function handleGroupChange(userId: string, groupId: string) {
    setActionLoading(`group-${userId}`)
    try {
      await assignMemberToGroup(projectId, userId, groupId || null)
      await loadData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Kunde inte ändra grupp')
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

  async function handleDeleteProject() {
    if (!project || deleteConfirmText !== project.name) return

    setIsDeleting(true)
    try {
      await deleteProject(project.id)
      router.push('/dashboard/projects')
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert(error instanceof Error ? error.message : 'Kunde inte radera projektet')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-8" />
        <div className="bg-white/80 border border-slate-200 rounded-2xl p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
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
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Projektet hittades inte</h2>
        <Link href="/dashboard/projects" className="text-indigo-600 hover:text-indigo-700">
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Medlemmar</h1>
            <p className="text-slate-500">{project.name}</p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Bjud in medlem
          </button>
        )}
      </motion.div>

      {/* Members list */}
      <motion.div
        variants={itemVariants}
        className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6"
      >
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Aktiva medlemmar ({members.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {members.map((member, index) => {
            const memberRoleName = member.role?.name as RoleName
            const isMemberOwner = isOwner(memberRoleName)
            const canEditThis = canChange && !isMemberOwner && member.user_id !== params.id

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium shadow-sm">
                  {member.profile?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-medium truncate">
                    {member.profile?.full_name || 'Okänd användare'}
                  </p>
                  <p className="text-slate-500 text-sm truncate">
                    {member.profile?.company || 'Inget företag'}
                  </p>
                </div>

                {/* Grupp-dropdown */}
                {canManage ? (
                  <select
                    value={member.group_id || ''}
                    onChange={(e) => handleGroupChange(member.user_id, e.target.value)}
                    disabled={actionLoading === `group-${member.user_id}`}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
                  >
                    <option value="">Ingen grupp</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                ) : member.group ? (
                  <span
                    className="px-3 py-1 rounded-full text-xs text-white font-medium"
                    style={{ backgroundColor: member.group.color }}
                  >
                    {member.group.name}
                  </span>
                ) : null}

                {canEditThis ? (
                  <select
                    value={member.role_id}
                    onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                    disabled={actionLoading === member.user_id}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    {getRoleDisplayName(memberRoleName)}
                  </span>
                )}

                {canManage && !isMemberOwner && member.user_id !== params.id && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={actionLoading === member.user_id}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Ta bort medlem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            )
          })}

          {members.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Inga medlemmar än</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6"
        >
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Väntande inbjudningar ({invitations.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {invitations.map((invitation, index) => (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-medium truncate">{invitation.email}</p>
                  <p className="text-slate-500 text-sm">
                    Inbjuden {new Date(invitation.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>
                <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600">
                  {getRoleDisplayName(invitation.role?.name as RoleName)}
                </span>
                {canManage && (
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    disabled={actionLoading === invitation.id}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Avbryt inbjudan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        userRole={userRole}
        onSuccess={loadData}
      />

      {/* Danger Zone - Delete Project */}
      {canDeleteProject(userRole) && (
        <motion.div
          variants={itemVariants}
          className="mt-12 bg-white/80 backdrop-blur-sm border border-red-200 rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="p-4 border-b border-red-100 bg-red-50/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="font-semibold text-red-700">Farozon</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-slate-900 font-medium mb-1">Radera projekt</h3>
                <p className="text-slate-500 text-sm">
                  När du raderar ett projekt tas alla dokument, ärenden, checklistor och annan data bort permanent.
                  Denna åtgärd kan inte ångras.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors whitespace-nowrap border border-red-200"
              >
                Radera projekt
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Radera projekt</h2>
            </div>
            <p className="text-slate-600 mb-4">
              Är du säker på att du vill radera <span className="text-slate-900 font-medium">{project.name}</span>?
              All data kommer att tas bort permanent.
            </p>
            <p className="text-slate-500 mb-2 text-sm">
              Skriv projektnamnet för att bekräfta:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={project.name}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteConfirmText !== project.name || isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Raderar...' : 'Radera permanent'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
