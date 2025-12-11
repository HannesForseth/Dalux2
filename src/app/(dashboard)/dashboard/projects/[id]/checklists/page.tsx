'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
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
  draft: { label: 'Utkast', color: 'text-slate-400', bgColor: 'bg-slate-800' },
  in_progress: { label: 'Pågår', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  completed: { label: 'Klar', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  approved: { label: 'Godkänd', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
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
          <h1 className="text-2xl font-bold text-white">Checklistor</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ny checklista
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-slate-400">Totalt</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-400">{stats.draft}</div>
          <div className="text-sm text-slate-400">Utkast</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
          <div className="text-sm text-slate-400">Pågår</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-sm text-slate-400">Klara</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-400">{stats.approved}</div>
          <div className="text-sm text-slate-400">Godkända</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ChecklistStatus | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alla status</option>
          <option value="draft">Utkast</option>
          <option value="in_progress">Pågår</option>
          <option value="completed">Klara</option>
          <option value="approved">Godkända</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">Checklistor</h2>
          </div>
          <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
            {checklists.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p>Inga checklistor hittades</p>
              </div>
            ) : (
              checklists.map((checklist) => {
                const completion = getCompletionPercentage(checklist.items || [])
                const status = statusConfig[checklist.status]
                const isSelected = selectedChecklist?.id === checklist.id

                return (
                  <div
                    key={checklist.id}
                    onClick={() => setSelectedChecklist(checklist)}
                    className={`p-4 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                      isSelected ? 'bg-slate-800/50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{checklist.name}</h3>
                        {checklist.description && (
                          <p className="text-sm text-slate-400 truncate mt-1">{checklist.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${status.bgColor} ${status.color}`}>
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
                                className="text-slate-700"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeDasharray={`${completion * 1.256} 126`}
                                className={completion === 100 ? 'text-green-500' : 'text-blue-500'}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                              {completion}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Checklist Detail */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {selectedChecklist ? (
            <>
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-white">{selectedChecklist.name}</h2>
                    {selectedChecklist.description && (
                      <p className="text-sm text-slate-400 mt-1">{selectedChecklist.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedChecklist.status}
                      onChange={(e) => handleStatusChange(selectedChecklist.id, e.target.value as ChecklistStatus)}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Utkast</option>
                      <option value="in_progress">Pågår</option>
                      <option value="completed">Klar</option>
                      <option value="approved">Godkänd</option>
                    </select>
                    <button
                      onClick={() => handleDelete(selectedChecklist.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
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
              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
                {!selectedChecklist.items || selectedChecklist.items.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p>Inga punkter i denna checklista</p>
                  </div>
                ) : (
                  selectedChecklist.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            item.is_checked
                              ? 'bg-green-500 border-green-500'
                              : 'border-slate-600 hover:border-slate-500'
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
                            <span className={`font-medium ${item.is_checked ? 'text-slate-500 line-through' : 'text-white'}`}>
                              {item.title}
                            </span>
                            {item.is_required && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                                Obligatorisk
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className={`text-sm mt-1 ${item.is_checked ? 'text-slate-600' : 'text-slate-400'}`}>
                              {item.description}
                            </p>
                          )}
                          {item.is_checked && item.checked_at && (
                            <p className="text-xs text-slate-500 mt-1">
                              Avklarad {formatDate(item.checked_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Item Button */}
              <div className="p-4 border-t border-slate-800">
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
            <div className="flex items-center justify-center h-full text-slate-400">
              <p>Välj en checklista för att se detaljer</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
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
    </div>
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
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Lägg till ny punkt..."
        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isAdding}
      />
      <label className="flex items-center gap-2 text-sm text-slate-400">
        <input
          type="checkbox"
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
          className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
          disabled={isAdding}
        />
        Obligatorisk
      </label>
      <button
        type="submit"
        disabled={!title.trim() || isAdding}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isAdding ? 'Lägger till...' : 'Lägg till'}
      </button>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Skapa ny checklista</h2>
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
              Namn <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="t.ex. Säkerhetskontroll Våning 3"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Beskrivning
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valfri beskrivning..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Plats
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="t.ex. Byggnad A"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Checklistpunkter
            </label>

            {items.length > 0 && (
              <div className="space-y-2 mb-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg"
                  >
                    <span className="flex-1 text-white">{item.title}</span>
                    {item.is_required && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                        Obligatorisk
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Ny punkt..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
              />
              <label className="flex items-center gap-1 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={newItemRequired}
                  onChange={(e) => setNewItemRequired(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                />
                Obl.
              </label>
              <button
                type="button"
                onClick={addItem}
                disabled={!newItemTitle.trim()}
                className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
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
              disabled={!name.trim() || isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Skapar...' : 'Skapa checklista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
