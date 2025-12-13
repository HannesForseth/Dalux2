'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getMyProjects } from '@/app/actions/projects'
import type { Project } from '@/types/database'
import ProjectCard from '@/components/projects/ProjectCard'
import { FolderOpen } from 'lucide-react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const data = await getMyProjects()
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter)

  const projectCounts = {
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    archived: projects.filter(p => p.status === 'archived').length,
  }

  const labels = {
    all: 'Alla',
    active: 'Aktiva',
    completed: 'Avslutade',
    archived: 'Arkiverade',
  }

  return (
    <div>
      {/* Header with gradient text */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Mina{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            projekt
          </span>
        </h1>
        <p className="text-slate-400">Översikt av alla dina projekt</p>
      </motion.div>

      {/* Modern filter tabs with pill design */}
      <motion.div
        className="flex gap-2 mb-6 p-1 bg-slate-800/50 rounded-xl w-fit"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {(['all', 'active', 'completed', 'archived'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filter === status
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {labels[status]} ({projectCounts[status]})
          </button>
        ))}
      </motion.div>

      {/* Projects grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-52 bg-slate-800/50 rounded-2xl animate-pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <motion.div
          className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 mb-4">
            <FolderOpen className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {filter === 'all' ? 'Inga projekt än' : `Inga ${labels[filter].toLowerCase()} projekt`}
          </h3>
          <p className="text-slate-400">
            {filter === 'all'
              ? 'Du är inte medlem i något projekt ännu.'
              : 'Det finns inga projekt med denna status.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
