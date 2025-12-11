'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useParams, usePathname } from 'next/navigation'
import type { Project } from '@/types/database'

interface ProjectContextType {
  currentProject: Project | null
  projectId: string | null
  isInProjectContext: boolean
  setCurrentProject: (project: Project | null) => void
}

const ProjectContext = createContext<ProjectContextType>({
  currentProject: null,
  projectId: null,
  isInProjectContext: false,
  setCurrentProject: () => {},
})

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

interface ProjectProviderProps {
  children: ReactNode
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const params = useParams()
  const pathname = usePathname()

  // Extract projectId from URL params
  const projectId = params?.id as string | undefined

  // Check if we're in a project context based on the URL path
  const isInProjectContext = pathname?.includes('/dashboard/projects/') && !!projectId

  // Reset project when leaving project context
  useEffect(() => {
    if (!isInProjectContext) {
      setCurrentProject(null)
    }
  }, [isInProjectContext])

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projectId: projectId || null,
        isInProjectContext,
        setCurrentProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}
