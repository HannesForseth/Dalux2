'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, Plus, Building2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types/database'

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  completed: 'bg-blue-500',
  archived: 'bg-slate-400',
}

export default function ProjectDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string | undefined

  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get projects where user is a member
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)

      if (!memberships?.length) {
        setIsLoading(false)
        return
      }

      const projectIds = memberships.map(m => m.project_id)
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('name')

      if (projectsData) {
        setProjects(projectsData)

        // Set current project
        if (projectId) {
          const current = projectsData.find(p => p.id === projectId)
          setCurrentProject(current || null)
        }
      }

      setIsLoading(false)
    }

    fetchProjects()
  }, [projectId])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectProject = (project: Project) => {
    setIsOpen(false)
    setSearchQuery('')
    router.push(`/dashboard/projects/${project.id}`)
  }

  // Don't render if not in project context
  if (!projectId) return null

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors group"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-slate-900 truncate max-w-[150px]">
            {isLoading ? 'Laddar...' : currentProject?.name || 'Välj projekt'}
          </p>
          {currentProject?.project_number && (
            <p className="text-xs text-slate-500">#{currentProject.project_number}</p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden z-50"
          >
            {/* Search */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Sök projekt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Project List */}
            <div className="max-h-64 overflow-y-auto py-2">
              {filteredProjects.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Inga projekt hittades</p>
              ) : (
                filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusColors[project.status] || 'bg-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </p>
                      {project.project_number && (
                        <p className="text-xs text-slate-500">#{project.project_number}</p>
                      )}
                    </div>
                    {project.id === projectId && (
                      <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Create New Project */}
            <div className="p-2 border-t border-slate-100">
              <Link
                href="/projects/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Skapa nytt projekt
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
