'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  getProjectDeviations,
  createDeviation,
  updateDeviation,
  deleteDeviation,
  getDeviationStats,
  getDeviationComments,
  addDeviationComment,
  getDeviationAttachments,
  addDeviationAttachment,
  deleteDeviationAttachment,
  getDeviationAttachmentUrl
} from '@/app/actions/deviations'
import { getProjectMembers } from '@/app/actions/members'
import type {
  DeviationWithDetails,
  DeviationStatus,
  DeviationSeverity,
  DeviationCategory,
  CreateDeviationData,
  DeviationComment,
  DeviationAttachment,
  ProjectMemberWithDetails
} from '@/types/database'

const statusConfig: Record<DeviationStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Öppen', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  investigating: { label: 'Under utredning', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  action_required: { label: 'Kräver åtgärd', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  corrected: { label: 'Åtgärdad', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  verified: { label: 'Verifierad', color: 'text-green-400', bg: 'bg-green-400/10' },
  closed: { label: 'Stängd', color: 'text-slate-400', bg: 'bg-slate-400/10' },
}

const severityConfig: Record<DeviationSeverity, { label: string; color: string; icon: string }> = {
  minor: { label: 'Mindre', color: 'text-yellow-400', icon: '○' },
  major: { label: 'Allvarlig', color: 'text-orange-400', icon: '●' },
  critical: { label: 'Kritisk', color: 'text-red-400', icon: '◉' },
}

const categoryConfig: Record<DeviationCategory, { label: string }> = {
  material: { label: 'Materialfel' },
  workmanship: { label: 'Utförandefel' },
  design: { label: 'Projekteringsfel' },
  safety: { label: 'Säkerhet' },
  documentation: { label: 'Dokumentation' },
  other: { label: 'Övrigt' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface CreateDeviationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: CreateDeviationData) => Promise<void>
  members: ProjectMemberWithDetails[]
}

function CreateDeviationModal({ isOpen, onClose, onCreate, members }: CreateDeviationModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DeviationCategory>('other')
  const [severity, setSeverity] = useState<DeviationSeverity>('minor')
  const [location, setLocation] = useState('')
  const [drawingReference, setDrawingReference] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        severity,
        location: location.trim() || undefined,
        drawing_reference: drawingReference.trim() || undefined,
        assigned_to: assignedTo || undefined,
        due_date: dueDate || undefined,
      })
      // Reset form
      setTitle('')
      setDescription('')
      setCategory('other')
      setSeverity('minor')
      setLocation('')
      setDrawingReference('')
      setAssignedTo('')
      setDueDate('')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="text-lg font-semibold text-white">Ny avvikelse</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="Kort beskrivning av avvikelsen"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Beskrivning</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="Detaljerad beskrivning av avvikelsen..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Kategori *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DeviationCategory)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {Object.entries(categoryConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Allvarlighet</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as DeviationSeverity)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {Object.entries(severityConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Plats</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="t.ex. Plan 2, Rum 205"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Ritningsref.</label>
              <input
                type="text"
                value={drawingReference}
                onChange={(e) => setDrawingReference(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="t.ex. K-101"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Ansvarig</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Ingen tilldelad</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.profile.full_name || 'Okänd'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Förfaller</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Skapar...' : 'Skapa avvikelse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DeviationDetailModalProps {
  deviation: DeviationWithDetails
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  members: ProjectMemberWithDetails[]
}

function DeviationDetailModal({ deviation, isOpen, onClose, onUpdate, members }: DeviationDetailModalProps) {
  const [comments, setComments] = useState<DeviationComment[]>([])
  const [attachments, setAttachments] = useState<DeviationAttachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [correctiveAction, setCorrectiveAction] = useState(deviation.corrective_action || '')
  const [rootCause, setRootCause] = useState(deviation.root_cause || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadComments()
      loadAttachments()
    }
  }, [isOpen, deviation.id])

  async function loadComments() {
    const data = await getDeviationComments(deviation.id)
    setComments(data)
  }

  async function loadAttachments() {
    const data = await getDeviationAttachments(deviation.id)
    setAttachments(data)
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      await addDeviationComment(deviation.id, newComment.trim())
      setNewComment('')
      await loadComments()
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      await addDeviationAttachment(deviation.id, file)
      await loadAttachments()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!confirm('Ta bort denna bilaga?')) return
    try {
      await deleteDeviationAttachment(attachmentId)
      await loadAttachments()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  async function handleViewAttachment(attachmentId: string) {
    try {
      const url = await getDeviationAttachmentUrl(attachmentId)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to get attachment URL:', error)
    }
  }

  async function handleSaveDetails() {
    setIsSaving(true)
    try {
      await updateDeviation(deviation.id, {
        corrective_action: correctiveAction || undefined,
        root_cause: rootCause || undefined,
      })
      onUpdate()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(newStatus: DeviationStatus) {
    try {
      await updateDeviation(deviation.id, { status: newStatus })
      onUpdate()
    } catch (error) {
      console.error('Status update failed:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <span className={`text-lg ${severityConfig[deviation.severity].color}`}>
              {severityConfig[deviation.severity].icon}
            </span>
            <h2 className="text-lg font-semibold text-white">
              AVV-{String(deviation.deviation_number).padStart(3, '0')}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">{deviation.title}</h3>
            {deviation.description && (
              <p className="text-slate-400">{deviation.description}</p>
            )}
          </div>

          {/* Status & Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={deviation.status}
                onChange={(e) => handleStatusChange(e.target.value as DeviationStatus)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Allvarlighet</label>
              <div className={`px-3 py-2 rounded-lg ${severityConfig[deviation.severity].color}`}>
                {severityConfig[deviation.severity].icon} {severityConfig[deviation.severity].label}
              </div>
            </div>
          </div>

          {/* Location & Reference */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {deviation.location && (
              <div>
                <span className="text-slate-500">Plats:</span>
                <span className="text-white ml-2">{deviation.location}</span>
              </div>
            )}
            {deviation.drawing_reference && (
              <div>
                <span className="text-slate-500">Ritningsref:</span>
                <span className="text-white ml-2">{deviation.drawing_reference}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Kategori:</span>
              <span className="text-white ml-2">{categoryConfig[deviation.category].label}</span>
            </div>
            {deviation.due_date && (
              <div>
                <span className="text-slate-500">Förfaller:</span>
                <span className="text-white ml-2">{formatDate(deviation.due_date)}</span>
              </div>
            )}
          </div>

          {/* People */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Rapporterad av:</span>
              <span className="text-white ml-2">{deviation.reporter?.full_name || 'Okänd'}</span>
            </div>
            {deviation.assignee && (
              <div>
                <span className="text-slate-500">Ansvarig:</span>
                <span className="text-white ml-2">{deviation.assignee.full_name}</span>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Bilagor</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-sm"
                >
                  <button
                    onClick={() => handleViewAttachment(att.id)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {att.file_name}
                  </button>
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-400 cursor-pointer transition-colors">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              {isUploading ? 'Laddar upp...' : '+ Lägg till bilaga'}
            </label>
          </div>

          {/* Root Cause */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Grundorsak</label>
            <textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="Beskriv grundorsaken till avvikelsen..."
            />
          </div>

          {/* Corrective Action */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Åtgärd</label>
            <textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="Beskriv vilken åtgärd som vidtagits..."
            />
          </div>

          <button
            onClick={handleSaveDetails}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Sparar...' : 'Spara ändringar'}
          </button>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Kommentarer</label>
            <div className="space-y-3 mb-4">
              {comments.length === 0 ? (
                <p className="text-slate-500 text-sm">Inga kommentarer än.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">
                        {(comment as DeviationComment & { author?: { full_name: string } }).author?.full_name || 'Okänd'}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Skriv en kommentar..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmittingComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                Skicka
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export default function ProjectDeviationsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [deviations, setDeviations] = useState<DeviationWithDetails[]>([])
  const [members, setMembers] = useState<ProjectMemberWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDeviation, setSelectedDeviation] = useState<DeviationWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState<DeviationStatus | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<DeviationSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<DeviationCategory | 'all'>('all')
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    investigating: 0,
    actionRequired: 0,
    corrected: 0,
    verified: 0,
    closed: 0,
    bySeverity: { minor: 0, major: 0, critical: 0 }
  })

  const loadData = useCallback(async () => {
    try {
      const [deviationData, statsData, membersData] = await Promise.all([
        getProjectDeviations(projectId, {
          status: statusFilter,
          severity: severityFilter,
          category: categoryFilter,
        }),
        getDeviationStats(projectId),
        getProjectMembers(projectId)
      ])
      setDeviations(deviationData)
      setStats(statsData)
      setMembers(membersData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, statusFilter, severityFilter, categoryFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async (data: CreateDeviationData) => {
    await createDeviation(projectId, data)
    await loadData()
  }

  const handleStatusChange = async (deviationId: string, newStatus: DeviationStatus) => {
    try {
      await updateDeviation(deviationId, { status: newStatus })
      await loadData()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async (deviationId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna avvikelse?')) return

    try {
      await deleteDeviation(deviationId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete deviation:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
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
          <h1 className="text-2xl font-bold text-white">Avvikelser (NCR)</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Rapportera
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-slate-400 text-xs">Totalt</p>
          <p className="text-xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-yellow-400 text-xs">Öppna</p>
          <p className="text-xl font-bold text-white">{stats.open}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-blue-400 text-xs">Utredning</p>
          <p className="text-xl font-bold text-white">{stats.investigating}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-orange-400 text-xs">Kräver åtgärd</p>
          <p className="text-xl font-bold text-white">{stats.actionRequired}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-cyan-400 text-xs">Åtgärdade</p>
          <p className="text-xl font-bold text-white">{stats.corrected}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-green-400 text-xs">Verifierade</p>
          <p className="text-xl font-bold text-white">{stats.verified}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <p className="text-slate-400 text-xs">Stängda</p>
          <p className="text-xl font-bold text-white">{stats.closed}</p>
        </div>
      </div>

      {/* Severity Summary */}
      <div className="flex gap-4 mb-4 text-sm">
        <span className="text-yellow-400">○ {stats.bySeverity.minor} mindre</span>
        <span className="text-orange-400">● {stats.bySeverity.major} allvarliga</span>
        <span className="text-red-400">◉ {stats.bySeverity.critical} kritiska</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DeviationStatus | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Alla statusar</option>
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as DeviationSeverity | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Alla allvarligheter</option>
          {Object.entries(severityConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as DeviationCategory | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Alla kategorier</option>
          {Object.entries(categoryConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {deviations.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all'
              ? 'Inga avvikelser matchar filtret'
              : 'Inga avvikelser än'}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all'
              ? 'Prova att ändra filter för att se fler avvikelser.'
              : 'Rapportera och spåra avvikelser enligt ISO 9001-standard för kvalitetsstyrning.'}
          </p>
          {statusFilter === 'all' && severityFilter === 'all' && categoryFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
            >
              Rapportera avvikelse
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {deviations.map((deviation) => (
            <div
              key={deviation.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors cursor-pointer"
              onClick={() => setSelectedDeviation(deviation)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-slate-500 text-sm font-mono">
                      AVV-{String(deviation.deviation_number).padStart(3, '0')}
                    </span>
                    <span className={`text-lg ${severityConfig[deviation.severity].color}`}>
                      {severityConfig[deviation.severity].icon}
                    </span>
                    <h3 className="text-white font-medium truncate">{deviation.title}</h3>
                  </div>

                  {deviation.description && (
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                      {deviation.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className={`px-2 py-0.5 rounded-full ${statusConfig[deviation.status].bg} ${statusConfig[deviation.status].color}`}>
                      {statusConfig[deviation.status].label}
                    </span>

                    <span className="text-slate-500">
                      {categoryConfig[deviation.category].label}
                    </span>

                    {deviation.location && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {deviation.location}
                      </span>
                    )}

                    <span className="text-slate-500">
                      {formatDate(deviation.created_at)}
                    </span>

                    {deviation.reporter && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
                          {deviation.reporter.full_name?.charAt(0) || '?'}
                        </div>
                        {deviation.reporter.full_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={deviation.status}
                    onChange={(e) => handleStatusChange(deviation.id, e.target.value as DeviationStatus)}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDelete(deviation.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Ta bort"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateDeviationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        members={members}
      />

      {selectedDeviation && (
        <DeviationDetailModal
          deviation={selectedDeviation}
          isOpen={!!selectedDeviation}
          onClose={() => setSelectedDeviation(null)}
          onUpdate={() => {
            loadData()
            // Refresh selected deviation
            const updated = deviations.find(d => d.id === selectedDeviation.id)
            if (updated) setSelectedDeviation(updated)
          }}
          members={members}
        />
      )}
    </div>
  )
}
