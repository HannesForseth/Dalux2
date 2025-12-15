'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getProjectChecklists,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  getChecklistStats,
} from '@/app/actions/checklists'
import type { ChecklistWithDetails, ChecklistStatus, ChecklistItem } from '@/types/database'

const statusConfig: Record<ChecklistStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Utkast', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  in_progress: { label: 'Pågår', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { label: 'Klar', color: 'text-green-600', bgColor: 'bg-green-100' },
  approved: { label: 'Godkänd', color: 'text-purple-600', bgColor: 'bg-purple-100' },
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('sv-SE')
}

function getCompletionPercentage(items: ChecklistItem[]): number {
  if (!items || items.length === 0) return 0
  const checked = items.filter(i => i.is_checked).length
  return Math.round((checked / items.length) * 100)
}

export default function ProjectChecklistsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [checklists, setChecklists] = useState<ChecklistWithDetails[]>([])
  const [stats, setStats] = useState({ total: 0, draft: 0, inProgress: 0, completed: 0, approved: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState<ChecklistStatus | 'all'>('all')

  const loadData = useCallback(async () => {
    try {
      const [checklistsData, statsData] = await Promise.all([
        getProjectChecklists(projectId, statusFilter),
        getChecklistStats(projectId),
      ])
      setChecklists(checklistsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load checklists:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggleItem = async (itemId: string) => {
    try {
      await toggleChecklistItem(itemId)
      // Refresh the selected checklist
      if (selectedChecklist) {
        const updated = await getProjectChecklists(projectId, statusFilter)
        const refreshed = updated.find(c => c.id === selectedChecklist.id)
        if (refreshed) {
          setSelectedChecklist(refreshed)
          setChecklists(updated)
        }
      }
    } catch (error) {
      console.error('Failed to toggle item:', error)
      alert('Kunde inte uppdatera punkten')
    }
  }

  const handleStatusChange = async (checklistId: string, newStatus: ChecklistStatus) => {
    try {
      await updateChecklist(checklistId, { status: newStatus })
      await loadData()
      if (selectedChecklist?.id === checklistId) {
        const updated = await getProjectChecklists(projectId, statusFilter)
        const refreshed = updated.find(c => c.id === checklistId)
        if (refreshed) setSelectedChecklist(refreshed)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Kunde inte uppdatera status')
    }
  }

  const handleDelete = async (checklistId: string) => {
    if (!confirm('Är du säker på att du vill radera denna checklista?')) return
    try {
      await deleteChecklist(checklistId)
      await loadData()
      if (selectedChecklist?.id === checklistId) {
        setSelectedChecklist(null)
      }
    } catch (error) {
      console.error('Failed to delete checklist:', error)
      alert('Kunde inte radera checklistan')
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Checklistor</h1>
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
          <span className="hidden sm:inline">Ny checklista</span>
          <span className="sm:hidden">Ny</span>
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: 'Totalt', value: stats.total, color: 'text-slate-900' },
          { label: 'Utkast', value: stats.draft, color: 'text-slate-600' },
          { label: 'Pågår', value: stats.inProgress, color: 'text-blue-600' },
          { label: 'Klara', value: stats.completed, color: 'text-green-600' },
          { label: 'Godkända', value: stats.approved, color: 'text-purple-600' },
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
          onChange={(e) => setStatusFilter(e.target.value as ChecklistStatus | 'all')}
          className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Alla status</option>
          <option value="draft">Utkast</option>
          <option value="in_progress">Pågår</option>
          <option value="completed">Klara</option>
          <option value="approved">Godkända</option>
        </select>
        {/* Mobile: back button when checklist is selected */}
        {selectedChecklist && (
          <button
            onClick={() => setSelectedChecklist(null)}
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
        {/* Checklist List - Hidden on mobile when a checklist is selected */}
        <motion.div
          className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm ${
            selectedChecklist ? 'hidden lg:block' : ''
          }`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Checklistor</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {checklists.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
                <p>Inga checklistor hittades</p>
              </div>
            ) : (
              checklists.map((checklist, index) => {
                const completion = getCompletionPercentage(checklist.items || [])
                const status = statusConfig[checklist.status]
                const isSelected = selectedChecklist?.id === checklist.id

                return (
                  <motion.div
                    key={checklist.id}
                    onClick={() => setSelectedChecklist(checklist)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-indigo-50/50 border-l-2 border-indigo-500' : ''
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 truncate">{checklist.name}</h3>
                        {checklist.description && (
                          <p className="text-sm text-slate-500 truncate mt-1">{checklist.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-lg ${status.bgColor} ${status.color} font-medium`}>
                            {status.label}
                          </span>
                          {checklist.items && checklist.items.length > 0 && (
                            <span className="text-xs text-slate-500">
                              {checklist.items.filter(i => i.is_checked).length}/{checklist.items.length} punkter
                            </span>
                          )}
                          {checklist.due_date && (
                            <span className="text-xs text-slate-500">
                              Förfaller: {formatDate(checklist.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {checklist.items && checklist.items.length > 0 && (
                          <div className="w-12 h-12 relative">
                            <svg className="w-12 h-12 transform -rotate-90">
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="text-slate-200"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeDasharray={`${completion * 1.256} 126`}
                                className={completion === 100 ? 'text-green-500' : 'text-indigo-500'}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700">
                              {completion}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Checklist Detail - Always visible on desktop, only when selected on mobile */}
        <motion.div
          className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm ${
            !selectedChecklist ? 'hidden lg:block' : ''
          }`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {selectedChecklist ? (
            <>
              <div className="p-3 sm:p-4 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-slate-900 text-sm sm:text-base">{selectedChecklist.name}</h2>
                    {selectedChecklist.description && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2">{selectedChecklist.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={selectedChecklist.status}
                      onChange={(e) => handleStatusChange(selectedChecklist.id, e.target.value as ChecklistStatus)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="draft">Utkast</option>
                      <option value="in_progress">Pågår</option>
                      <option value="completed">Klar</option>
                      <option value="approved">Godkänd</option>
                    </select>
                    <button
                      onClick={() => handleDelete(selectedChecklist.id)}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-slate-500">
                  {selectedChecklist.location && (
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                      {selectedChecklist.location}
                    </span>
                  )}
                  {selectedChecklist.due_date && (
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      {formatDate(selectedChecklist.due_date)}
                    </span>
                  )}
                  {selectedChecklist.creator && (
                    <span>Skapad av: {selectedChecklist.creator.full_name || 'Okänd'}</span>
                  )}
                </div>
              </div>

              {/* Checklist Items */}
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {!selectedChecklist.items || selectedChecklist.items.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <p>Inga punkter i denna checklista</p>
                  </div>
                ) : (
                  selectedChecklist.items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            item.is_checked
                              ? 'bg-green-500 border-green-500'
                              : 'border-slate-300 hover:border-indigo-500'
                          }`}
                        >
                          {item.is_checked && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${item.is_checked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                              {item.title}
                            </span>
                            {item.is_required && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">
                                Obligatorisk
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className={`text-sm mt-1 ${item.is_checked ? 'text-slate-400' : 'text-slate-500'}`}>
                              {item.description}
                            </p>
                          )}
                          {item.is_checked && item.checked_at && (
                            <p className="text-xs text-slate-400 mt-1">
                              Avklarad {formatDate(item.checked_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Add Item Button */}
              <div className="p-4 border-t border-slate-200">
                <AddItemForm
                  checklistId={selectedChecklist.id}
                  onItemAdded={async () => {
                    const updated = await getProjectChecklists(projectId, statusFilter)
                    const refreshed = updated.find(c => c.id === selectedChecklist.id)
                    if (refreshed) {
                      setSelectedChecklist(refreshed)
                      setChecklists(updated)
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
              <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
              <p className="text-lg font-medium text-slate-700">Välj en checklista</p>
              <p className="text-sm text-slate-500 mt-1">Klicka på en checklista till vänster för att se detaljer</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateChecklistModal
            projectId={projectId}
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

// Add Item Form Component
function AddItemForm({
  checklistId,
  onItemAdded,
}: {
  checklistId: string
  onItemAdded: () => void
}) {
  const [title, setTitle] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsAdding(true)
    try {
      await addChecklistItem(checklistId, { title: title.trim(), is_required: isRequired })
      setTitle('')
      setIsRequired(false)
      onItemAdded()
    } catch (error) {
      console.error('Failed to add item:', error)
      alert('Kunde inte lägga till punkten')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Lägg till ny punkt..."
        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        disabled={isAdding}
      />
      <div className="flex items-center gap-2 sm:gap-3">
        <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
            disabled={isAdding}
          />
          <span className="hidden sm:inline">Obligatorisk</span>
          <span className="sm:hidden">Obl.</span>
        </label>
        <motion.button
          type="submit"
          disabled={!title.trim() || isAdding}
          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          whileHover={{ scale: !title.trim() || isAdding ? 1 : 1.02 }}
          whileTap={{ scale: !title.trim() || isAdding ? 1 : 0.98 }}
        >
          {isAdding ? 'Lägger till...' : 'Lägg till'}
        </motion.button>
      </div>
    </form>
  )
}

// Create Checklist Modal Component
function CreateChecklistModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState<{ title: string; is_required: boolean }[]>([])
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemRequired, setNewItemRequired] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const addItem = () => {
    if (!newItemTitle.trim()) return
    setItems([...items, { title: newItemTitle.trim(), is_required: newItemRequired }])
    setNewItemTitle('')
    setNewItemRequired(false)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsCreating(true)
    try {
      await createChecklist(
        projectId,
        {
          name: name.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          due_date: dueDate || undefined,
          status: 'draft',
        },
        items.length > 0 ? items : undefined
      )
      onCreated()
    } catch (error) {
      console.error('Failed to create checklist:', error)
      alert('Kunde inte skapa checklistan')
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
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">Skapa ny checklista</h2>
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
              Namn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="t.ex. Säkerhetskontroll Våning 3"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Beskrivning
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valfri beskrivning..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plats
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="t.ex. Byggnad A"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
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

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Checklistpunkter
            </label>

            {items.length > 0 && (
              <div className="space-y-2 mb-3">
                {items.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl"
                  >
                    <span className="flex-1 text-slate-900">{item.title}</span>
                    {item.is_required && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">
                        Obligatorisk
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Ny punkt..."
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
              />
              <label className="flex items-center gap-1 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={newItemRequired}
                  onChange={(e) => setNewItemRequired(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                />
                Obl.
              </label>
              <button
                type="button"
                onClick={addItem}
                disabled={!newItemTitle.trim()}
                className="p-2 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
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
              disabled={!name.trim() || isCreating}
              className="px-4 py-2.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              whileHover={{ scale: !name.trim() || isCreating ? 1 : 1.02 }}
              whileTap={{ scale: !name.trim() || isCreating ? 1 : 0.98 }}
            >
              {isCreating ? 'Skapar...' : 'Skapa checklista'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
