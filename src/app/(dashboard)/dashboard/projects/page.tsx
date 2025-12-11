'use client'

import { useEffect, useState } from 'react'
import { getMyProjects } from '@/app/actions/projects'
import type { Project } from '@/types/database'
import ProjectCard from '@/components/projects/ProjectCard'
import CreateProjectModal from '@/components/projects/CreateProjectModal'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projekt</h1>
          <p className="text-slate-400 mt-1">Hantera och översikt av alla dina projekt</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusIcon />
          Nytt projekt
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'completed', 'archived'] as const).map((status) => {
          const labels = {
            all: 'Alla',
            active: 'Aktiva',
            completed: 'Avslutade',
            archived: 'Arkiverade',
          }
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {labels[status]} ({projectCounts[status]})
            </button>
          )
        })}
      </div>

      {/* Projects grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-slate-800 rounded w-3/4 mb-4" />
              <div className="h-4 bg-slate-800 rounded w-full mb-2" />
              <div className="h-4 bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
            <FolderIcon />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {filter === 'all' ? 'Inga projekt än' : `Inga ${filter === 'active' ? 'aktiva' : filter === 'completed' ? 'avslutade' : 'arkiverade'} projekt`}
          </h3>
          <p className="text-slate-400 mb-6">
            {filter === 'all'
              ? 'Skapa ditt första projekt för att komma igång.'
              : 'Det finns inga projekt med denna status.'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusIcon />
              Skapa projekt
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadProjects}
      />
    </div>
  )
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}
