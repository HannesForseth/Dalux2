'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getMyProjects } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'
import { Plus, MapPin, FolderOpen, LogOut } from 'lucide-react'
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Användare'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 overflow-hidden relative">
      {/* Animated background blobs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          top: "-200px",
          left: "-200px",
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          bottom: "-150px",
          right: "-150px",
        }}
        animate={{
          x: [0, -20, 0],
          y: [0, -30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)",
          top: "40%",
          right: "-100px",
        }}
        animate={{
          x: [0, 20, 0],
          y: [0, 40, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Glassmorphism Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center group-hover:scale-105 transition-transform duration-300">
            <Image
              src="/bloxr-logo.png"
              alt="Bloxr"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-slate-600 text-sm hidden sm:inline">{userName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-12 relative z-10">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3 sm:mb-4">
            Välj{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              projekt
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-600">
            Välj ett befintligt projekt eller skapa ett nytt
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="animate-pulse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="h-44 sm:h-52 bg-slate-200/50 rounded-2xl" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Create new project card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              whileHover={{ scale: 1.02 }}
            >
              <Link
                href="/projects/new"
                className="group flex flex-col items-center justify-center h-44 sm:h-52 bg-white/60 backdrop-blur-sm border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-400 hover:bg-white/80 transition-all shadow-lg shadow-slate-200/50"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/25">
                  <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <span className="text-slate-900 font-semibold text-base sm:text-lg">Skapa nytt projekt</span>
                <span className="text-slate-500 text-xs sm:text-sm mt-1">Välj plan och kom igång</span>
              </Link>
            </motion.div>

            {/* Existing projects - light cards with same design */}
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: (index + 1) * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className={`group flex flex-col ${project.image_url ? 'h-64 sm:h-72' : 'h-44 sm:h-52'} bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-white transition-all overflow-hidden shadow-lg shadow-slate-200/50`}
                >
                  {/* Project Image */}
                  {project.image_url ? (
                    <div className="relative h-28 w-full flex-shrink-0">
                      <Image
                        src={project.image_url}
                        alt={project.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      {/* Status badge on image */}
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={project.status} />
                      </div>
                    </div>
                  ) : (
                    /* Status bar at top when no image */
                    <div className={`h-1.5 ${getStatusColor(project.status)}`} />
                  )}

                  <div className="flex-1 p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-slate-900 font-semibold text-base sm:text-lg truncate group-hover:text-indigo-600 transition-colors">
                          {project.name}
                        </h3>
                        {project.project_number && (
                          <p className="text-slate-500 text-xs sm:text-sm">#{project.project_number}</p>
                        )}
                      </div>
                      {/* Only show badge here if no image */}
                      {!project.image_url && <StatusBadge status={project.status} />}
                    </div>

                    <div className="space-y-1 sm:space-y-1.5 text-slate-500 text-xs sm:text-sm">
                      {project.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{project.city}</span>
                        </div>
                      )}
                      {project.address && !project.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{project.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-slate-100 bg-slate-50/50">
                    <span className="text-slate-500 text-[10px] sm:text-xs">
                      Skapad {new Date(project.created_at).toLocaleDateString('sv-SE')}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Empty state */}
            {projects.length === 0 && (
              <motion.div
                className="col-span-full bg-white/60 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Inga projekt än</h3>
                <p className="text-slate-600 mb-6">Skapa ditt första projekt för att komma igång!</p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
                >
                  <Link href="/projects/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Skapa projekt
                  </Link>
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: 'active' | 'completed' | 'archived' }) {
  const config = {
    active: { label: 'Aktiv', color: 'bg-green-100 text-green-700 border-green-200' },
    completed: { label: 'Klar', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    archived: { label: 'Arkiverad', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  }
  const { label, color } = config[status]
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${color}`}>
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
