'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMyProjects } from '@/app/actions/projects'
import type { User } from '@supabase/supabase-js'
import type { Project } from '@/types/database'

export default function ProjectSelectorPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    try {
      const projectsData = await getMyProjects()
      setProjects(projectsData)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Användare'

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D2</span>
            </div>
            <span className="text-white font-semibold">Dalux2</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{userName}</span>
            <button
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Logga ut
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Välj projekt</h1>
          <p className="text-slate-400">
            Välj ett befintligt projekt eller skapa ett nytt
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create new project card */}
            <Link
              href="/projects/new"
              className="group flex flex-col items-center justify-center h-48 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 hover:bg-slate-800/50 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-colors">
                <PlusIcon className="text-blue-400" />
              </div>
              <span className="text-white font-medium">Skapa nytt projekt</span>
              <span className="text-slate-500 text-sm mt-1">Välj plan och kom igång</span>
            </Link>

            {/* Existing projects */}
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group flex flex-col h-48 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 hover:bg-slate-800/50 transition-all overflow-hidden"
              >
                {/* Project header with color */}
                <div className={`h-2 ${getStatusColor(project.status)}`} />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">
                        {project.name}
                      </h3>
                      {project.project_number && (
                        <p className="text-slate-500 text-sm">{project.project_number}</p>
                      )}
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  <div className="space-y-1.5">
                    {project.city && (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <LocationIcon />
                        <span className="truncate">{project.city}</span>
                      </div>
                    )}
                    {project.address && (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-800 bg-slate-800/30">
                  <span className="text-slate-500 text-xs">
                    Skapad {new Date(project.created_at).toLocaleDateString('sv-SE')}
                  </span>
                </div>
              </Link>
            ))}

            {/* Empty state message */}
            {projects.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-slate-500">
                  Du har inga projekt än. Skapa ditt första projekt för att komma igång!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: 'active' | 'completed' | 'archived' }) {
  const config = {
    active: { label: 'Aktiv', color: 'bg-green-500/10 text-green-400' },
    completed: { label: 'Klar', color: 'bg-blue-500/10 text-blue-400' },
    archived: { label: 'Arkiverad', color: 'bg-slate-500/10 text-slate-400' },
  }
  const { label, color } = config[status]
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${color}`}>
      {label}
    </span>
  )
}

function getStatusColor(status: 'active' | 'completed' | 'archived'): string {
  const colors = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    archived: 'bg-slate-500',
  }
  return colors[status]
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}
