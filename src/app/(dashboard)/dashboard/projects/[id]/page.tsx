'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getProjectWithMembers, getUserRoleInProject, getProjectStats, getProjectActivity } from '@/app/actions/projects'
import type { ProjectStats, ActivityItem } from '@/app/actions/projects'
import type { ProjectWithMembers, RoleName } from '@/types/database'
import { canUpdateProject, canManageMembers, getRoleDisplayName } from '@/lib/permissions'

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<ProjectWithMembers | null>(null)
  const [userRole, setUserRole] = useState<RoleName | null>(null)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProject()
  }, [projectId])

  async function loadProject() {
    try {
      const [projectData, role, projectStats, projectActivity] = await Promise.all([
        getProjectWithMembers(projectId),
        getUserRoleInProject(projectId),
        getProjectStats(projectId),
        getProjectActivity(projectId, 15)
      ])
      setProject(projectData)
      setUserRole(role as RoleName)
      setStats(projectStats)
      setActivities(projectActivity)
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setIsLoading(false)
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
          <Link
            href={`/dashboard/projects/${project.id}/settings/members`}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
          >
            Inställningar
          </Link>
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

          {/* Quick actions with real counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionCard
              title="Dokument"
              count={stats?.documentsCount.toString() || '0'}
              icon={<DocumentIcon />}
              href={`/dashboard/projects/${project.id}/documents`}
            />
            <QuickActionCard
              title="Avvikelser"
              count={stats?.issuesCount.toString() || '0'}
              subtext={stats?.openIssuesCount ? `${stats.openIssuesCount} öppna` : undefined}
              icon={<ExclamationIcon />}
              href={`/dashboard/projects/${project.id}/issues`}
              highlight={stats?.openIssuesCount ? stats.openIssuesCount > 0 : false}
            />
            <QuickActionCard
              title="Checklistor"
              count={stats?.checklistsCount.toString() || '0'}
              subtext={stats?.completedChecklistsCount ? `${stats.completedChecklistsCount} klara` : undefined}
              icon={<ClipboardIcon />}
              href={`/dashboard/projects/${project.id}/checklists`}
            />
            <QuickActionCard
              title="RFI"
              count={stats?.rfisCount.toString() || '0'}
              subtext={stats?.openRfisCount ? `${stats.openRfisCount} öppna` : undefined}
              icon={<QuestionIcon />}
              href={`/dashboard/projects/${project.id}/rfi`}
              highlight={stats?.openRfisCount ? stats.openRfisCount > 0 : false}
            />
          </div>

          {/* Activity Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Senaste aktivitet</h2>

            {activities.length === 0 ? (
              <p className="text-slate-500 text-sm">Ingen aktivitet än</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} projectId={project.id} />
                ))}
              </div>
            )}
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

          {/* Quick Stats Summary */}
          {stats && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Snabbstatistik</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Totalt dokument</span>
                  <span className="text-white font-medium">{stats.documentsCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Öppna avvikelser</span>
                  <span className={`font-medium ${stats.openIssuesCount > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                    {stats.openIssuesCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Checklistor klara</span>
                  <span className="text-white font-medium">
                    {stats.completedChecklistsCount}/{stats.checklistsCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Öppna RFI</span>
                  <span className={`font-medium ${stats.openRfisCount > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                    {stats.openRfisCount}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({
  title,
  count,
  subtext,
  icon,
  href,
  highlight = false,
}: {
  title: string
  count: string
  subtext?: string
  icon: React.ReactNode
  href: string
  highlight?: boolean
}) {
  return (
    <Link href={href}>
      <div className={`bg-slate-900 border rounded-xl p-4 hover:border-slate-700 transition-colors ${
        highlight ? 'border-amber-500/30' : 'border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={highlight ? 'text-amber-400' : 'text-slate-400'}>{icon}</div>
          <div>
            <p className="text-white font-medium">{count}</p>
            <p className="text-slate-500 text-sm">{title}</p>
            {subtext && (
              <p className={`text-xs ${highlight ? 'text-amber-400' : 'text-slate-500'}`}>{subtext}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function ActivityCard({ activity, projectId }: { activity: ActivityItem; projectId: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    document_uploaded: <DocumentPlusIcon />,
    document_updated: <DocumentIcon />,
    document_version: <ArrowPathIcon />,
    document_comment: <ChatBubbleIcon />,
    issue_created: <ExclamationIcon />,
    issue_updated: <ExclamationIcon />,
    checklist_created: <ClipboardIcon />,
    checklist_completed: <CheckCircleIcon />,
  }

  const colorMap: Record<string, string> = {
    document_uploaded: 'text-blue-400 bg-blue-500/10',
    document_updated: 'text-slate-400 bg-slate-500/10',
    document_version: 'text-purple-400 bg-purple-500/10',
    document_comment: 'text-green-400 bg-green-500/10',
    issue_created: 'text-amber-400 bg-amber-500/10',
    issue_updated: 'text-amber-400 bg-amber-500/10',
    checklist_created: 'text-cyan-400 bg-cyan-500/10',
    checklist_completed: 'text-green-400 bg-green-500/10',
  }

  const getLink = () => {
    if (activity.metadata?.documentId) {
      return `/dashboard/projects/${projectId}/documents?doc=${activity.metadata.documentId}`
    }
    if (activity.metadata?.issueId) {
      return `/dashboard/projects/${projectId}/issues`
    }
    if (activity.metadata?.checklistId) {
      return `/dashboard/projects/${projectId}/checklists`
    }
    return null
  }

  const link = getLink()
  const content = (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[activity.type]}`}>
        {iconMap[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{activity.title}</span>
          <span className="text-slate-500 text-xs">{formatRelativeTime(activity.timestamp)}</span>
        </div>
        <p className="text-slate-400 text-sm truncate">{activity.description}</p>
        <p className="text-slate-500 text-xs">{activity.user.name}</p>
      </div>
    </div>
  )

  if (link) {
    return (
      <Link href={link} className="block hover:bg-slate-800/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
        {content}
      </Link>
    )
  }

  return <div className="py-2">{content}</div>
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just nu'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min sedan`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} tim sedan`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dagar sedan`

  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
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

function DocumentPlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
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

function QuestionIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  )
}

function ArrowPathIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function ChatBubbleIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
