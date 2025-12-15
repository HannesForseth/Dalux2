'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getProjectWithMembers, getUserRoleInProject, getProjectStats, getProjectActivity } from '@/app/actions/projects'
import type { ProjectStats, ActivityItem } from '@/app/actions/projects'
import type { ProjectWithMembers, RoleName } from '@/types/database'
import { canUpdateProject, canManageMembers, getRoleDisplayName } from '@/lib/permissions'
import AttentionSection from '@/components/dashboard/AttentionSection'
import MiniCalendar from '@/components/calendar/MiniCalendar'
import CalendarModal from '@/components/calendar/CalendarModal'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<ProjectWithMembers | null>(null)
  const [userRole, setUserRole] = useState<RoleName | null>(null)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)

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
        <div className="h-8 bg-slate-200 rounded-xl w-1/3 mb-4" />
        <div className="h-4 bg-slate-200 rounded-lg w-2/3 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/60 border border-slate-200 rounded-2xl p-6 h-64" />
          <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 h-64" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
          <ExclamationIcon className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Projektet hittades inte</h2>
        <p className="text-slate-600 mb-6">Det här projektet finns inte eller så har du inte tillgång till det.</p>
        <Link
          href="/projects"
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Tillbaka till projekt
        </Link>
      </div>
    )
  }

  const statusConfig = {
    active: { label: 'Aktiv', color: 'bg-green-100 text-green-700 border-green-200' },
    completed: { label: 'Avslutad', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    archived: { label: 'Arkiverad', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  }
  const status = statusConfig[project.status]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {project.name}
            </h1>
            <span className={`px-2.5 sm:px-3 py-1 text-xs font-medium rounded-full border ${status.color}`}>
              {status.label}
            </span>
          </div>
          {project.project_number && (
            <p className="text-slate-500 text-sm sm:text-base">#{project.project_number}</p>
          )}
        </div>

        {userRole && canUpdateProject(userRole) && (
          <Link
            href={`/dashboard/projects/${project.id}/settings`}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/80 text-slate-700 rounded-xl font-medium hover:bg-white hover:shadow-md border border-slate-200 transition-all text-sm sm:text-base"
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Inställningar</span>
          </Link>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project info */}
          <motion.div
            variants={itemVariants}
            className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Projektinformation</h2>

            {project.description && (
              <p className="text-slate-600 mb-6">{project.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(project.address || project.city) && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Plats</p>
                  <p className="text-slate-900 font-medium">
                    {[project.address, project.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {project.start_date && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Projektperiod</p>
                  <p className="text-slate-900 font-medium">
                    {formatDate(project.start_date)}
                    {project.end_date && ` - ${formatDate(project.end_date)}`}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick actions with real counts */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <QuickActionCard
              title="Dokument"
              count={stats?.documentsCount.toString() || '0'}
              icon={<DocumentIcon />}
              href={`/dashboard/projects/${project.id}/documents`}
              index={0}
            />
            <QuickActionCard
              title="Ärenden"
              count={stats?.issuesCount.toString() || '0'}
              subtext={stats?.openIssuesCount ? `${stats.openIssuesCount} öppna` : undefined}
              icon={<ExclamationIcon />}
              href={`/dashboard/projects/${project.id}/issues`}
              highlight={stats?.openIssuesCount ? stats.openIssuesCount > 0 : false}
              index={1}
            />
            <QuickActionCard
              title="Avvikelser"
              count={stats?.deviationsCount.toString() || '0'}
              subtext={stats?.criticalDeviationsCount ? `${stats.criticalDeviationsCount} kritiska` : stats?.openDeviationsCount ? `${stats.openDeviationsCount} öppna` : undefined}
              icon={<ShieldExclamationIcon />}
              href={`/dashboard/projects/${project.id}/deviations`}
              highlight={(stats?.criticalDeviationsCount ?? 0) > 0 || (stats?.actionRequiredDeviationsCount ?? 0) > 0}
              highlightColor="red"
              index={2}
            />
            <QuickActionCard
              title="Checklistor"
              count={stats?.checklistsCount.toString() || '0'}
              subtext={stats?.completedChecklistsCount ? `${stats.completedChecklistsCount} klara` : undefined}
              icon={<ClipboardIcon />}
              href={`/dashboard/projects/${project.id}/checklists`}
              index={3}
            />
            <QuickActionCard
              title="F/S"
              count={stats?.rfisCount.toString() || '0'}
              subtext={stats?.openRfisCount ? `${stats.openRfisCount} öppna` : undefined}
              icon={<QuestionIcon />}
              href={`/dashboard/projects/${project.id}/rfi`}
              highlight={stats?.openRfisCount ? stats.openRfisCount > 0 : false}
              index={4}
            />
            <QuickActionCard
              title="Protokoll"
              count={stats?.protocolsCount.toString() || '0'}
              subtext={stats?.unseenProtocolsCount ? `${stats.unseenProtocolsCount} nya` : stats?.draftProtocolsCount ? `${stats.draftProtocolsCount} utkast` : undefined}
              icon={<ProtocolIcon />}
              href={`/dashboard/projects/${project.id}/protocols`}
              highlight={stats?.unseenProtocolsCount ? stats.unseenProtocolsCount > 0 : false}
              index={5}
            />
          </motion.div>

          {/* Attention Section - Kräver uppmärksamhet */}
          {stats && (
            <AttentionSection stats={stats} projectId={project.id} />
          )}

          {/* Activity Feed */}
          <motion.div
            variants={itemVariants}
            className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Senaste aktivitet</h2>

            {activities.length === 0 ? (
              <p className="text-slate-500 text-sm">Ingen aktivitet än</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <ActivityCard key={activity.id} activity={activity} projectId={project.id} index={index} />
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team members */}
          <motion.div
            variants={itemVariants}
            className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Projektteam</h2>
              {userRole && canManageMembers(userRole) && (
                <Link
                  href={`/dashboard/projects/${project.id}/settings/members`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Hantera
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {project.members.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                    {member.profile?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 text-sm font-medium truncate">
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
                  className="block text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  +{project.members.length - 5} fler medlemmar
                </Link>
              )}

              {project.members.length === 0 && (
                <p className="text-slate-500 text-sm">Inga medlemmar än</p>
              )}
            </div>
          </motion.div>

          {/* Your role */}
          {userRole && (
            <motion.div
              variants={itemVariants}
              className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Din roll</h2>
              <p className="text-slate-600">{getRoleDisplayName(userRole)}</p>
            </motion.div>
          )}

          {/* Quick Stats Summary */}
          {stats && (
            <motion.div
              variants={itemVariants}
              className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Snabbstatistik</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Totalt dokument</span>
                  <span className="text-slate-900 font-medium">{stats.documentsCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Öppna ärenden</span>
                  <span className={`font-medium ${stats.openIssuesCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {stats.openIssuesCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Checklistor klara</span>
                  <span className="text-slate-900 font-medium">
                    {stats.completedChecklistsCount}/{stats.checklistsCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Öppna F/S</span>
                  <span className={`font-medium ${stats.openRfisCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {stats.openRfisCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Nya protokoll</span>
                  <span className={`font-medium ${stats.unseenProtocolsCount > 0 ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {stats.unseenProtocolsCount}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Mini Calendar */}
          <motion.div variants={itemVariants}>
            <MiniCalendar
              projectId={project.id}
              onExpandClick={() => setIsCalendarModalOpen(true)}
              refreshKey={calendarRefreshKey}
            />
          </motion.div>
        </div>
      </div>

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        projectId={project.id}
        onEventCreated={() => setCalendarRefreshKey(k => k + 1)}
      />
    </motion.div>
  )
}

function QuickActionCard({
  title,
  count,
  subtext,
  icon,
  href,
  highlight = false,
  highlightColor = 'amber',
  index = 0,
}: {
  title: string
  count: string
  subtext?: string
  icon: React.ReactNode
  href: string
  highlight?: boolean
  highlightColor?: 'amber' | 'red'
  index?: number
}) {
  const colorClasses = {
    amber: {
      border: 'border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:shadow-amber-100/50',
      icon: 'bg-amber-100 text-amber-600 group-hover:bg-amber-200',
      text: 'text-amber-600'
    },
    red: {
      border: 'border-red-200 bg-red-50/50 hover:border-red-300 hover:shadow-red-100/50',
      icon: 'bg-red-100 text-red-600 group-hover:bg-red-200',
      text: 'text-red-600'
    }
  }
  const colors = colorClasses[highlightColor]

  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`bg-white/80 backdrop-blur-sm border rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group shadow-sm ${
          highlight
            ? colors.border
            : 'border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
            highlight
              ? colors.icon
              : 'bg-slate-100 text-slate-500 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-500 group-hover:text-white'
          }`}>
            <span className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5">
              {icon}
            </span>
          </div>
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              className="text-slate-900 font-semibold text-base sm:text-lg"
            >
              {count}
            </motion.p>
            <p className="text-slate-500 text-xs sm:text-sm truncate">{title}</p>
            {subtext && (
              <p className={`text-xs truncate ${highlight ? colors.text : 'text-slate-400'}`}>{subtext}</p>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

function ActivityCard({ activity, projectId, index }: { activity: ActivityItem; projectId: string; index: number }) {
  const iconMap: Record<string, React.ReactNode> = {
    document_uploaded: <DocumentPlusIcon />,
    document_updated: <DocumentIcon className="w-4 h-4" />,
    document_version: <ArrowPathIcon />,
    document_comment: <ChatBubbleIcon />,
    issue_created: <ExclamationIcon className="w-4 h-4" />,
    issue_updated: <ExclamationIcon className="w-4 h-4" />,
    checklist_created: <ClipboardIcon className="w-4 h-4" />,
    checklist_completed: <CheckCircleIcon />,
    protocol_created: <ProtocolSmallIcon />,
    protocol_finalized: <CheckCircleIcon />,
  }

  const colorMap: Record<string, string> = {
    document_uploaded: 'bg-blue-100 text-blue-600',
    document_updated: 'bg-slate-100 text-slate-600',
    document_version: 'bg-purple-100 text-purple-600',
    document_comment: 'bg-green-100 text-green-600',
    issue_created: 'bg-amber-100 text-amber-600',
    issue_updated: 'bg-amber-100 text-amber-600',
    checklist_created: 'bg-cyan-100 text-cyan-600',
    checklist_completed: 'bg-green-100 text-green-600',
    protocol_created: 'bg-indigo-100 text-indigo-600',
    protocol_finalized: 'bg-green-100 text-green-600',
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
    if (activity.metadata?.protocolId) {
      return `/dashboard/projects/${projectId}/protocols/${activity.metadata.protocolId}`
    }
    return null
  }

  const link = getLink()
  const content = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex gap-3"
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[activity.type] || 'bg-slate-100 text-slate-600'}`}>
        {iconMap[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-900 text-sm font-medium">{activity.title}</span>
          <span className="text-slate-400 text-xs">{formatRelativeTime(activity.timestamp)}</span>
        </div>
        <p className="text-slate-500 text-sm truncate">{activity.description}</p>
        <p className="text-slate-400 text-xs">{activity.user.name}</p>
      </div>
    </motion.div>
  )

  if (link) {
    return (
      <Link href={link} className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded-xl transition-colors">
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

function DocumentIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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

function ExclamationIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function ClipboardIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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

function ProtocolIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  )
}

function ProtocolSmallIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  )
}

function ShieldExclamationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
    </svg>
  )
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ChevronLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ExpandIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  )
}

function SettingsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}
