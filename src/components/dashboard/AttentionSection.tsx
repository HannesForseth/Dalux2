'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { ProjectStats } from '@/app/actions/projects'

interface AttentionSectionProps {
  stats: ProjectStats
  projectId: string
}

export default function AttentionSection({ stats, projectId }: AttentionSectionProps) {
  const items = [
    {
      key: 'overdue-issues',
      count: stats.overdueIssuesCount,
      label: 'förfallna ärenden',
      href: `/dashboard/projects/${projectId}/issues?filter=overdue`,
      color: 'red',
      icon: <ClockAlertIcon />
    },
    {
      key: 'critical-deviations',
      count: stats.criticalDeviationsCount,
      label: 'kritiska avvikelser',
      href: `/dashboard/projects/${projectId}/deviations?filter=critical`,
      color: 'red',
      icon: <ShieldAlertIcon />
    },
    {
      key: 'pending-actions',
      count: stats.pendingActionItemsCount,
      label: 'åtgärdspunkter',
      href: `/dashboard/projects/${projectId}/protocols`,
      color: 'amber',
      icon: <TaskIcon />
    },
    {
      key: 'upcoming-deadlines',
      count: stats.upcomingDeadlinesCount,
      label: 'deadlines denna vecka',
      href: `/dashboard/projects/${projectId}`,
      color: 'indigo',
      icon: <CalendarIcon />
    }
  ]

  const activeItems = items.filter(item => item.count > 0)

  if (activeItems.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-r from-amber-50/80 to-red-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
          <AlertIcon className="w-4 h-4 text-amber-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">Kräver uppmärksamhet</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item, index) => (
          <AttentionCard
            key={item.key}
            count={item.count}
            label={item.label}
            href={item.href}
            color={item.color as 'red' | 'amber' | 'indigo'}
            icon={item.icon}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  )
}

function AttentionCard({
  count,
  label,
  href,
  color,
  icon,
  index
}: {
  count: number
  label: string
  href: string
  color: 'red' | 'amber' | 'indigo'
  icon: React.ReactNode
  index: number
}) {
  const colorClasses = {
    red: {
      bg: count > 0 ? 'bg-red-50 hover:bg-red-100 border-red-200' : 'bg-white/60 border-slate-200',
      icon: count > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400',
      text: count > 0 ? 'text-red-700' : 'text-slate-400',
      count: count > 0 ? 'text-red-600' : 'text-slate-400'
    },
    amber: {
      bg: count > 0 ? 'bg-amber-50 hover:bg-amber-100 border-amber-200' : 'bg-white/60 border-slate-200',
      icon: count > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400',
      text: count > 0 ? 'text-amber-700' : 'text-slate-400',
      count: count > 0 ? 'text-amber-600' : 'text-slate-400'
    },
    indigo: {
      bg: count > 0 ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' : 'bg-white/60 border-slate-200',
      icon: count > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400',
      text: count > 0 ? 'text-indigo-700' : 'text-slate-400',
      count: count > 0 ? 'text-indigo-600' : 'text-slate-400'
    }
  }

  const colors = colorClasses[color]

  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        whileHover={{ scale: count > 0 ? 1.02 : 1 }}
        className={`p-3 rounded-xl border transition-all ${colors.bg} ${count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.icon}`}>
            {icon}
          </div>
          <div>
            <p className={`text-lg font-bold ${colors.count}`}>{count}</p>
            <p className={`text-xs ${colors.text}`}>{label}</p>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// Icons
function AlertIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function ClockAlertIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ShieldAlertIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}
