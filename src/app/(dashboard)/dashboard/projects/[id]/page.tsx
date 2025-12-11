'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProjectWithMembers, getUserRoleInProject, deleteProject } from '@/app/actions/projects'
import type { ProjectWithMembers, RoleName } from '@/types/database'
import { canDeleteProject, canUpdateProject, canManageMembers, getRoleDisplayName } from '@/lib/permissions'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<ProjectWithMembers | null>(null)
  const [userRole, setUserRole] = useState<RoleName | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    loadProject()
  }, [projectId])

  async function loadProject() {
    try {
      const [projectData, role] = await Promise.all([
        getProjectWithMembers(projectId),
        getUserRoleInProject(projectId)
      ])
      setProject(projectData)
      setUserRole(role as RoleName)
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!project) return
    setIsDeleting(true)
    try {
      await deleteProject(project.id)
      router.push('/dashboard/projects')
    } catch (error) {
      console.error('Failed to delete project:', error)
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3 mb-4" />
        <div className="h-4 bg-slate-800 rounded w-2/3 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 h-64" />
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-64" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Projektet hittades inte</h2>
        <p className="text-slate-400 mb-6">Det här projektet finns inte eller så har du inte tillgång till det.</p>
        <Link
          href="/dashboard/projects"
          className="text-blue-400 hover:text-blue-300"
        >
          Tillbaka till projekt
        </Link>
      </div>
    )
  }

  const statusConfig = {
    active: { label: 'Aktiv', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    completed: { label: 'Avslutad', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    archived: { label: 'Arkiverad', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  }
  const status = statusConfig[project.status]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/projects"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon />
            </Link>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${status.color}`}>
              {status.label}
            </span>
          </div>
          {project.project_number && (
            <p className="text-slate-400">#{project.project_number}</p>
          )}
        </div>

        {userRole && canUpdateProject(userRole) && (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/projects/${project.id}/settings/members`}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Inställningar
            </Link>
            {canDeleteProject(userRole) && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600/10 text-red-400 rounded-lg font-medium hover:bg-red-600/20 transition-colors"
              >
                Radera
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Projektinformation</h2>

            {project.description && (
              <p className="text-slate-300 mb-6">{project.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              {(project.address || project.city) && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Plats</p>
                  <p className="text-white">
                    {[project.address, project.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {project.start_date && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Projektperiod</p>
                  <p className="text-white">
                    {formatDate(project.start_date)}
                    {project.end_date && ` - ${formatDate(project.end_date)}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionCard
              title="Dokument"
              count="0"
              icon={<DocumentIcon />}
              href={`/dashboard/projects/${project.id}/documents`}
            />
            <QuickActionCard
              title="Avvikelser"
              count="0"
              icon={<ExclamationIcon />}
              href={`/dashboard/projects/${project.id}/issues`}
            />
            <QuickActionCard
              title="Checklistor"
              count="0"
              icon={<ClipboardIcon />}
              href={`/dashboard/projects/${project.id}/checklists`}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team members */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Projektteam</h2>
              {userRole && canManageMembers(userRole) && (
                <Link
                  href={`/dashboard/projects/${project.id}/settings/members`}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Hantera
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {project.members.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-medium">
                    {member.profile?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {member.profile?.full_name || 'Okänd användare'}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {getRoleDisplayName(member.role?.name as RoleName)}
                    </p>
                  </div>
                </div>
              ))}

              {project.members.length > 5 && (
                <Link
                  href={`/dashboard/projects/${project.id}/settings/members`}
                  className="block text-sm text-slate-400 hover:text-white"
                >
                  +{project.members.length - 5} fler medlemmar
                </Link>
              )}

              {project.members.length === 0 && (
                <p className="text-slate-500 text-sm">Inga medlemmar än</p>
              )}
            </div>
          </div>

          {/* Your role */}
          {userRole && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Din roll</h2>
              <p className="text-slate-300">{getRoleDisplayName(userRole)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Radera projekt?</h3>
            <p className="text-slate-400 mb-6">
              Är du säker på att du vill radera "{project.name}"? Detta kan inte ångras.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Raderar...' : 'Radera projekt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QuickActionCard({
  title,
  count,
  icon,
  href,
}: {
  title: string
  count: string
  icon: React.ReactNode
  href: string
}) {
  return (
    <Link href={href}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
        <div className="flex items-center gap-3">
          <div className="text-slate-400">{icon}</div>
          <div>
            <p className="text-white font-medium">{count}</p>
            <p className="text-slate-500 text-sm">{title}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ArrowLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function ExclamationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  )
}
