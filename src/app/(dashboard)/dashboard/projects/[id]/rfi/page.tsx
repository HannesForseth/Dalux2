'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getProjectRfis,
  createRfi,
  updateRfi,
  answerRfi,
  closeRfi,
  deleteRfi,
  getRfiStats,
  addRfiAttachment,
} from '@/app/actions/rfi'
import { getProjectWithMembers } from '@/app/actions/projects'
import type { RfiWithDetails, RfiStatus, RfiPriority, Profile } from '@/types/database'

const statusConfig: Record<RfiStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Öppen', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  pending: { label: 'Väntar', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  answered: { label: 'Besvarad', color: 'text-green-600', bgColor: 'bg-green-100' },
  closed: { label: 'Stängd', color: 'text-slate-600', bgColor: 'bg-slate-100' },
}

const priorityConfig: Record<RfiPriority, { label: string; color: string }> = {
  low: { label: 'Låg', color: 'text-slate-600' },
  medium: { label: 'Medium', color: 'text-amber-600' },
  high: { label: 'Hög', color: 'text-orange-600' },
  urgent: { label: 'Brådskande', color: 'text-red-600' },
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('sv-SE')
}

export default function ProjectRfiPage() {
  const params = useParams()
  const projectId = params.id as string

  const [rfis, setRfis] = useState<RfiWithDetails[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [stats, setStats] = useState({ total: 0, open: 0, pending: 0, answered: 0, closed: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRfi, setSelectedRfi] = useState<RfiWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState<RfiStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<RfiPriority | 'all'>('all')

  const loadData = useCallback(async () => {
    try {
      const [rfisData, statsData, projectData] = await Promise.all([
        getProjectRfis(projectId, {
          status: statusFilter,
          priority: priorityFilter,
        }),
        getRfiStats(projectId),
        getProjectWithMembers(projectId),
      ])
      setRfis(rfisData)
      setStats(statsData)
      // Extract profiles from project members
      if (projectData?.members) {
        setMembers(projectData.members.map(m => m.profile).filter((p): p is Profile => p !== null))
      }
    } catch (error) {
      console.error('Failed to load RFIs:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, statusFilter, priorityFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStatusChange = async (rfiId: string, newStatus: RfiStatus) => {
    try {
      if (newStatus === 'closed') {
        await closeRfi(rfiId)
      } else {
        await updateRfi(rfiId, { status: newStatus })
      }
      await loadData()
      if (selectedRfi?.id === rfiId) {
        const updated = await getProjectRfis(projectId, { status: statusFilter, priority: priorityFilter })
        const refreshed = updated.find(r => r.id === rfiId)
        if (refreshed) setSelectedRfi(refreshed)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Kunde inte uppdatera status')
    }
  }

  const handleDelete = async (rfiId: string) => {
    if (!confirm('Är du säker på att du vill radera denna fråga?')) return
    try {
      await deleteRfi(rfiId)
      await loadData()
      if (selectedRfi?.id === rfiId) {
        setSelectedRfi(null)
      }
    } catch (error) {
      console.error('Failed to delete RFI:', error)
      alert('Kunde inte radera frågan')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Frågor & Svar</h1>
        </div>
        <motion.button
          onClick={() => setShowCreateModal(true)}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 text-sm sm:text-base"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">Ny fråga</span>
          <span className="sm:hidden">Ny</span>
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: 'Totalt', value: stats.total, color: 'text-slate-900' },
          { label: 'Öppna', value: stats.open, color: 'text-amber-600' },
          { label: 'Väntar', value: stats.pending, color: 'text-blue-600' },
          { label: 'Besvarade', value: stats.answered, color: 'text-green-600' },
          { label: 'Stängda', value: stats.closed, color: 'text-slate-600' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs sm:text-sm text-slate-500">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RfiStatus | 'all')}
          className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Alla status</option>
          <option value="open">Öppna</option>
          <option value="pending">Väntar</option>
          <option value="answered">Besvarade</option>
          <option value="closed">Stängda</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as RfiPriority | 'all')}
          className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Alla prioriteter</option>
          <option value="low">Låg</option>
          <option value="medium">Medium</option>
          <option value="high">Hög</option>
          <option value="urgent">Brådskande</option>
        </select>
        {/* Mobile: back button when RFI is selected */}
        {selectedRfi && (
          <button
            onClick={() => setSelectedRfi(null)}
            className="lg:hidden flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Tillbaka till lista
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* RFI List - Hidden on mobile when an RFI is selected */}
        <motion.div
          className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm ${
            selectedRfi ? 'hidden lg:block' : ''
          }`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Frågor</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {rfis.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                <p>Inga frågor hittades</p>
              </div>
            ) : (
              rfis.map((rfi, index) => {
                const status = statusConfig[rfi.status]
                const priority = priorityConfig[rfi.priority]
                const isSelected = selectedRfi?.id === rfi.id

                return (
                  <motion.div
                    key={rfi.id}
                    onClick={() => setSelectedRfi(rfi)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-indigo-50/50 border-l-2 border-indigo-500' : ''
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">
                            RFI-{rfi.rfi_number}
                          </span>
                          <span className={`text-xs font-medium ${priority.color}`}>
                            {priority.label}
                          </span>
                        </div>
                        <h3 className="font-medium text-slate-900 truncate mt-1">{rfi.subject}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-lg ${status.bgColor} ${status.color} font-medium`}>
                            {status.label}
                          </span>
                          {rfi.due_date && (
                            <span className="text-xs text-slate-500">
                              Förfaller: {formatDate(rfi.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      {rfi.question}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                      <span>
                        Av: {rfi.requester?.full_name || 'Okänd'}
                      </span>
                      <span>{formatDate(rfi.created_at)}</span>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* RFI Detail - Always visible on desktop, only when selected on mobile */}
        <motion.div
          className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm ${
            !selectedRfi ? 'hidden lg:block' : ''
          }`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {selectedRfi ? (
            <RfiDetail
              rfi={selectedRfi}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onAnswered={async () => {
                await loadData()
                const updated = await getProjectRfis(projectId, { status: statusFilter, priority: priorityFilter })
                const refreshed = updated.find(r => r.id === selectedRfi.id)
                if (refreshed) setSelectedRfi(refreshed)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
              <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
              <p className="text-lg font-medium text-slate-700">Välj en fråga</p>
              <p className="text-sm text-slate-500 mt-1">Klicka på en fråga till vänster för att se detaljer</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRfiModal
            projectId={projectId}
            members={members}
            onClose={() => setShowCreateModal(false)}
            onCreated={async () => {
              await loadData()
              setShowCreateModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// RFI Detail Component
function RfiDetail({
  rfi,
  onStatusChange,
  onDelete,
  onAnswered,
}: {
  rfi: RfiWithDetails
  onStatusChange: (id: string, status: RfiStatus) => void
  onDelete: (id: string) => void
  onAnswered: () => void
}) {
  const [showAnswerForm, setShowAnswerForm] = useState(false)
  const [answer, setAnswer] = useState(rfi.answer || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const status = statusConfig[rfi.status]
  const priority = priorityConfig[rfi.priority]

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return

    setIsSubmitting(true)
    try {
      await answerRfi(rfi.id, answer.trim())
      setShowAnswerForm(false)
      onAnswered()
    } catch (error) {
      console.error('Failed to answer RFI:', error)
      alert('Kunde inte svara på frågan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 font-mono">RFI-{rfi.rfi_number}</span>
              <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
            </div>
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base">{rfi.subject}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={rfi.status}
              onChange={(e) => onStatusChange(rfi.id, e.target.value as RfiStatus)}
              className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="open">Öppen</option>
              <option value="pending">Väntar</option>
              <option value="answered">Besvarad</option>
              <option value="closed">Stängd</option>
            </select>
            <button
              onClick={() => onDelete(rfi.id)}
              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-slate-500">
          <span className={`px-2 py-1 rounded-lg ${status.bgColor} ${status.color} font-medium`}>
            {status.label}
          </span>
          {rfi.category && (
            <span className="px-2 py-1 bg-slate-100 rounded-lg">{rfi.category}</span>
          )}
          {rfi.due_date && (
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              {formatDate(rfi.due_date)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto">
        {/* Question */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Fråga</h3>
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-slate-900 whitespace-pre-wrap">{rfi.question}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
              <span>Av: {rfi.requester?.full_name || 'Okänd'}</span>
              <span>{formatDate(rfi.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Assigned To */}
        {rfi.assignee && (
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Tilldelad</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium shadow-md">
                {(rfi.assignee.full_name || '?')[0].toUpperCase()}
              </div>
              <span className="text-slate-900">
                {rfi.assignee.full_name || 'Okänd'}
              </span>
            </div>
          </div>
        )}

        {/* Answer */}
        {rfi.answer ? (
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Svar</h3>
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-slate-900 whitespace-pre-wrap">{rfi.answer}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-200 text-xs text-slate-500">
                <span>Av: {rfi.answerer?.full_name || 'Okänd'}</span>
                <span>{formatDate(rfi.answered_at)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Svar</h3>
            {showAnswerForm ? (
              <form onSubmit={handleSubmitAnswer} className="space-y-3">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Skriv ditt svar..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  required
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAnswerForm(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Avbryt
                  </button>
                  <motion.button
                    type="submit"
                    disabled={!answer.trim() || isSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    whileHover={{ scale: !answer.trim() || isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: !answer.trim() || isSubmitting ? 1 : 0.98 }}
                  >
                    {isSubmitting ? 'Skickar...' : 'Skicka svar'}
                  </motion.button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAnswerForm(true)}
                className="w-full p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Svara på frågan
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// Create RFI Modal Component
function CreateRfiModal({
  projectId,
  members,
  onClose,
  onCreated,
}: {
  projectId: string
  members: Profile[]
  onClose: () => void
  onCreated: () => void
}) {
  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')
  const [priority, setPriority] = useState<RfiPriority>('medium')
  const [category, setCategory] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !question.trim()) return

    setIsCreating(true)
    try {
      const rfi = await createRfi(projectId, {
        subject: subject.trim(),
        question: question.trim(),
        priority,
        category: category.trim() || undefined,
        assigned_to: assignedTo || undefined,
        due_date: dueDate || undefined,
      })
      // Upload attachments if any
      if (files.length > 0) {
        await Promise.all(files.map(file => {
          const formData = new FormData()
          formData.append('file', file)
          return addRfiAttachment(rfi.id, formData)
        }))
      }
      onCreated()
    } catch (error) {
      console.error('Failed to create RFI:', error)
      alert('Kunde inte skapa frågan')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">Skapa ny fråga</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ämne <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Kort beskrivning av frågan"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fråga <span className="text-red-500">*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Beskriv din fråga i detalj..."
              rows={4}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prioritet
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RfiPriority)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Låg</option>
                <option value="medium">Medium</option>
                <option value="high">Hög</option>
                <option value="urgent">Brådskande</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kategori
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="t.ex. El, VVS"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tilldela till
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Ingen tilldelning</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || 'Okänd'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Förfallodatum
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bilagor
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
              />
              <svg className="h-8 w-8 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
              <p className="text-sm text-slate-600">Dra filer hit eller klicka för att välja</p>
              <p className="text-xs text-slate-400 mt-1">Bilder, PDF, Word, Excel, CAD-filer</p>
            </div>
            {/* Selected files list */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(index) }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200 sticky bottom-0 bg-white pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-sm sm:text-base"
            >
              Avbryt
            </button>
            <motion.button
              type="submit"
              disabled={!subject.trim() || !question.trim() || isCreating}
              className="px-4 py-2.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              whileHover={{ scale: !subject.trim() || !question.trim() || isCreating ? 1 : 1.02 }}
              whileTap={{ scale: !subject.trim() || !question.trim() || isCreating ? 1 : 0.98 }}
            >
              {isCreating ? 'Skapar...' : 'Skapa fråga'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
