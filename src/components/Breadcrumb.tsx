'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronRight, Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BreadcrumbItem {
  label: string
  href: string
  current: boolean
}

const sectionNames: Record<string, string> = {
  documents: 'Dokument',
  issues: 'Ärenden',
  deviations: 'Avvikelser',
  checklists: 'Checklistor',
  rfi: 'Frågor & Svar',
  protocols: 'Protokoll',
  settings: 'Inställningar',
  help: 'Hjälp',
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const params = useParams()
  const projectId = params?.id as string | undefined
  const [projectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjectName() {
      if (!projectId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      if (data) {
        setProjectName(data.name)
      }
    }

    fetchProjectName()
  }, [projectId])

  const breadcrumbs: BreadcrumbItem[] = []

  if (!pathname) return null

  // Always start with projects
  if (pathname.includes('/dashboard/projects/')) {
    breadcrumbs.push({
      label: 'Projekt',
      href: '/projects',
      current: false,
    })

    // Add project name if we have it
    if (projectId) {
      const isProjectRoot = pathname === `/dashboard/projects/${projectId}`
      breadcrumbs.push({
        label: projectName || 'Laddar...',
        href: `/dashboard/projects/${projectId}`,
        current: isProjectRoot,
      })

      // Add section if present
      const pathParts = pathname.split('/')
      const sectionIndex = pathParts.indexOf(projectId) + 1
      if (pathParts[sectionIndex]) {
        const sectionKey = pathParts[sectionIndex]
        const sectionLabel = sectionNames[sectionKey] || sectionKey
        breadcrumbs.push({
          label: sectionLabel,
          href: `/dashboard/projects/${projectId}/${sectionKey}`,
          current: true,
        })
      }
    }
  } else if (pathname === '/dashboard') {
    breadcrumbs.push({
      label: 'Översikt',
      href: '/dashboard',
      current: true,
    })
  } else if (pathname === '/projects') {
    breadcrumbs.push({
      label: 'Projekt',
      href: '/projects',
      current: true,
    })
  } else if (pathname.includes('/dashboard/settings')) {
    breadcrumbs.push({
      label: 'Inställningar',
      href: '/dashboard/settings',
      current: true,
    })
  } else if (pathname.includes('/dashboard/help')) {
    breadcrumbs.push({
      label: 'Hjälp',
      href: '/dashboard/help',
      current: true,
    })
  }

  if (breadcrumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1">
        {breadcrumbs.map((item, index) => (
          <motion.li
            key={item.href}
            className="flex items-center"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.2 }}
          >
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-400 mx-1 flex-shrink-0" />
            )}
            {item.current ? (
              <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-slate-500 hover:text-indigo-600 transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </motion.li>
        ))}
      </ol>
    </nav>
  )
}
