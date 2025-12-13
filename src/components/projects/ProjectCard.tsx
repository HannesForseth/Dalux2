'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, Calendar } from 'lucide-react'
import type { Project } from '@/types/database'

interface ProjectCardProps {
  project: Project
  index?: number
}

export default function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const statusConfig = {
    active: {
      label: 'Aktiv',
      color: 'bg-green-500/10 text-green-400 border-green-500/20',
      barColor: 'bg-green-500'
    },
    completed: {
      label: 'Avslutad',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      barColor: 'bg-blue-500'
    },
    archived: {
      label: 'Arkiverad',
      color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      barColor: 'bg-slate-500'
    },
  }

  const status = statusConfig[project.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      <Link href={`/dashboard/projects/${project.id}`}>
        <div className="group flex flex-col h-52 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-800/80 transition-all overflow-hidden shadow-xl shadow-slate-900/20 cursor-pointer">
          {/* Status bar at top */}
          <div className={`h-1.5 ${status.barColor}`} />

          <div className="flex-1 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                  {project.name}
                </h3>
                {project.project_number && (
                  <p className="text-sm text-slate-500 mt-0.5">#{project.project_number}</p>
                )}
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${status.color}`}>
                {status.label}
              </span>
            </div>

            {project.description && (
              <p className="text-slate-400 text-sm mb-3 line-clamp-2">{project.description}</p>
            )}

            <div className="space-y-1.5 text-sm text-slate-400">
              {(project.address || project.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {[project.address, project.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              {project.start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {formatDate(project.start_date)}
                    {project.end_date && ` - ${formatDate(project.end_date)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-800/30">
            <span className="text-slate-500 text-xs">
              Skapad {formatDate(project.created_at)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
