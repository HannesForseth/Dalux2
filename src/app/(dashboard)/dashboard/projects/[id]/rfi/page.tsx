'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import {
  getProjectRfis,
  createRfi,
  updateRfi,
  answerRfi,
  closeRfi,
  deleteRfi,
  getRfiStats,
} from '@/app/actions/rfi'
import { getProjectWithMembers } from '@/app/actions/projects'
import type { RfiWithDetails, RfiStatus, RfiPriority, Profile } from '@/types/database'

const statusConfig: Record<RfiStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Öppen', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  pending: { label: 'Väntar', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  answered: { label: 'Besvarad', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  closed: { label: 'Stängd', color: 'text-slate-400', bgColor: 'bg-slate-800' },
}

const priorityConfig: Record<RfiPriority, { label: string; color: string }> = {
  low: { label: 'Låg', color: 'text-slate-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  high: { label: 'Hög', color: 'text-orange-400' },
  urgent: { label: 'Brådskande', color: 'text-red-400' },
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
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-white">Frågor & Svar</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ny fråga
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-slate-400">Totalt</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.open}</div>
          <div className="text-sm text-slate-400">Öppna</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.pending}</div>
          <div className="text-sm text-slate-400">Väntar</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{stats.answered}</div>
          <div className="text-sm text-slate-400">Besvarade</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-400">{stats.closed}</div>
          <div className="text-sm text-slate-400">Stängda</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RfiStatus | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alla prioriteter</option>
          <option value="low">Låg</option>
          <option value="medium">Medium</option>
          <option value="high">Hög</option>
          <option value="urgent">Brådskande</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RFI List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">Frågor</h2>
          </div>
          <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
            {rfis.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p>Inga frågor hittades</p>
              </div>
            ) : (
              rfis.map((rfi) => {
                const status = statusConfig[rfi.status]
                const priority = priorityConfig[rfi.priority]
                const isSelected = selectedRfi?.id === rfi.id

                return (
                  <div
                    key={rfi.id}
                    onClick={() => setSelectedRfi(rfi)}
                    className={`p-4 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                      isSelected ? 'bg-slate-800/50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">
                            RFI-{rfi.rfi_number}
                          </span>
                          <span className={`text-xs ${priority.color}`}>
                            {priority.label}
                          </span>
                        </div>
                        <h3 className="font-medium text-white truncate mt-1">{rfi.subject}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${status.bgColor} ${status.color}`}>
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
                    <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                      {rfi.question}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                      <span>
                        Av: {rfi.requester?.full_name || 'Okänd'}
                      </span>
                      <span>{formatDate(rfi.created_at)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RFI Detail */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
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
            <div className="flex items-center justify-center h-full text-slate-400">
              <p>Välj en fråga för att se detaljer</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
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
    </div>
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
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 font-mono">RFI-{rfi.rfi_number}</span>
              <span className={`text-xs ${priority.color}`}>{priority.label}</span>
            </div>
            <h2 className="font-semibold text-white">{rfi.subject}</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={rfi.status}
              onChange={(e) => onStatusChange(rfi.id, e.target.value as RfiStatus)}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">Öppen</option>
              <option value="pending">Väntar</option>
              <option value="answered">Besvarad</option>
              <option value="closed">Stängd</option>
            </select>
            <button
              onClick={() => onDelete(rfi.id)}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
          <span className={`px-2 py-1 rounded ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
          {rfi.category && (
            <span className="px-2 py-1 bg-slate-800 rounded">{rfi.category}</span>
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
          <h3 className="text-sm font-medium text-slate-400 mb-2">Fråga</h3>
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-white whitespace-pre-wrap">{rfi.question}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
              <span>Av: {rfi.requester?.full_name || 'Okänd'}</span>
              <span>{formatDate(rfi.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Assigned To */}
        {rfi.assignee && (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Tilldelad</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {(rfi.assignee.full_name || '?')[0].toUpperCase()}
              </div>
              <span className="text-white">
                {rfi.assignee.full_name || 'Okänd'}
              </span>
            </div>
          </div>
        )}

        {/* Answer */}
        {rfi.answer ? (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Svar</h3>
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-white whitespace-pre-wrap">{rfi.answer}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-500/20 text-xs text-slate-500">
                <span>Av: {rfi.answerer?.full_name || 'Okänd'}</span>
                <span>{formatDate(rfi.answered_at)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Svar</h3>
            {showAnswerForm ? (
              <form onSubmit={handleSubmitAnswer} className="space-y-3">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Skriv ditt svar..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAnswerForm(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={!answer.trim() || isSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Skickar...' : 'Skicka svar'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAnswerForm(true)}
                className="w-full p-4 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-blue-500 transition-colors flex items-center justify-center gap-2"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !question.trim()) return

    setIsCreating(true)
    try {
      await createRfi(projectId, {
        subject: subject.trim(),
        question: question.trim(),
        priority,
        category: category.trim() || undefined,
        assigned_to: assignedTo || undefined,
        due_date: dueDate || undefined,
      })
      onCreated()
    } catch (error) {
      console.error('Failed to create RFI:', error)
      alert('Kunde inte skapa frågan')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Skapa ny fråga</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Ämne <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Kort beskrivning av frågan"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Fråga <span className="text-red-400">*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Beskriv din fråga i detalj..."
              rows={4}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Prioritet
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RfiPriority)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Låg</option>
                <option value="medium">Medium</option>
                <option value="high">Hög</option>
                <option value="urgent">Brådskande</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Kategori
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="t.ex. El, VVS"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Tilldela till
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Förfallodatum
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!subject.trim() || !question.trim() || isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Skapar...' : 'Skapa fråga'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
