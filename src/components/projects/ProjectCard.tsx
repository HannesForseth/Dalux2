'use client'

import Link from 'next/link'
import type { Project } from '@/types/database'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const statusConfig = {
    active: { label: 'Aktiv', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    completed: { label: 'Avslutad', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    archived: { label: 'Arkiverad', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  }

  const status = statusConfig[project.status]

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
              {project.name}
            </h3>
            {project.project_number && (
              <p className="text-sm text-slate-500 mt-0.5">#{project.project_number}</p>
            )}
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${status.color}`}>
            {status.label}
          </span>
        </div>

        {project.description && (
          <p className="text-slate-400 text-sm mb-4 line-clamp-2">{project.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-slate-500">
          {(project.address || project.city) && (
            <div className="flex items-center gap-1">
              <LocationIcon />
              <span>
                {[project.address, project.city].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {project.start_date && (
            <div className="flex items-center gap-1">
              <CalendarIcon />
              <span>
                {formatDate(project.start_date)}
                {project.end_date && ` - ${formatDate(project.end_date)}`}
              </span>
            </div>
          )}
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

function LocationIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}
