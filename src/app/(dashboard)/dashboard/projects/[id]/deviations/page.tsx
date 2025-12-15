'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
import { getProjectGroupsWithCounts } from '@/app/actions/groups'
import type {
  DeviationWithDetails,
  DeviationStatus,
  DeviationSeverity,
  DeviationCategory,
  CreateDeviationData,
  DeviationComment,
  DeviationAttachment,
  ProjectMemberWithDetails,
  ProjectGroup
} from '@/types/database'

const statusConfig: Record<DeviationStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Öppen', color: 'text-amber-600', bg: 'bg-amber-100' },
  investigating: { label: 'Under utredning', color: 'text-blue-600', bg: 'bg-blue-100' },
  action_required: { label: 'Kräver åtgärd', color: 'text-orange-600', bg: 'bg-orange-100' },
  corrected: { label: 'Åtgärdad', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  verified: { label: 'Verifierad', color: 'text-green-600', bg: 'bg-green-100' },
  closed: { label: 'Stängd', color: 'text-slate-600', bg: 'bg-slate-100' },
}

const severityConfig: Record<DeviationSeverity, { label: string; color: string; icon: string }> = {
  minor: { label: 'Mindre', color: 'text-amber-500', icon: '○' },
  major: { label: 'Allvarlig', color: 'text-orange-500', icon: '●' },
  critical: { label: 'Kritisk', color: 'text-red-500', icon: '◉' },
}

const categoryConfig: Record<DeviationCategory, { label: string }> = {
  material: { label: 'Materialfel' },
  workmanship: { label: 'Utförandefel' },
  design: { label: 'Projekteringsfel' },
  safety: { label: 'Säkerhet' },
  documentation: { label: 'Dokumentation' },
  other: { label: 'Övrigt' },
}

const ITEMS_PER_PAGE = 10

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
  onCreate: (data: CreateDeviationData, files: File[]) => Promise<void>
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
      }, files)
      // Reset form
      setTitle('')
      setDescription('')
      setCategory('other')
      setSeverity('minor')
      setLocation('')
      setDrawingReference('')
      setAssignedTo('')
      setDueDate('')
      setFiles([])
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-900">Ny avvikelse</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titel *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Kort beskrivning av avvikelsen"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivning</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Detaljerad beskrivning av avvikelsen..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kategori *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DeviationCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    {Object.entries(categoryConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Allvarlighet</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as DeviationSeverity)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    {Object.entries(severityConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plats</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="t.ex. Plan 2, Rum 205"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ritningsref.</label>
                  <input
                    type="text"
                    value={drawingReference}
                    onChange={(e) => setDrawingReference(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="t.ex. K-101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ansvarig</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Förfaller</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                          <XIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Skapar...' : 'Skapa avvikelse'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface DeviationDetailModalProps {
  deviation: DeviationWithDetails
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  members: ProjectMemberWithDetails[]
  groups: (ProjectGroup & { member_count: number })[]
}

function DeviationDetailModal({ deviation, isOpen, onClose, onUpdate, members, groups }: DeviationDetailModalProps) {
  const params = useParams()
  const projectId = params.id as string
  const [comments, setComments] = useState<DeviationComment[]>([])
  const [attachments, setAttachments] = useState<DeviationAttachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [correctiveAction, setCorrectiveAction] = useState(deviation.corrective_action || '')
  const [rootCause, setRootCause] = useState(deviation.root_cause || '')
  const [isSaving, setIsSaving] = useState(false)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const commentInputRef = useRef<HTMLInputElement>(null)

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
      await addDeviationComment(deviation.id, newComment.trim(), {
        members: members.map(m => ({
          user_id: m.user_id,
          full_name: m.profile.full_name || '',
          email: m.profile.email || undefined
        })),
        groups: groups.map(g => ({ id: g.id, name: g.name })),
        deviationNumber: deviation.deviation_number,
        deviationTitle: deviation.title,
        projectId
      })
      setNewComment('')
      setShowMentionSuggestions(false)
      await loadComments()
    } finally {
      setIsSubmittingComment(false)
    }
  }

  // Handle @ mention detection
  function handleCommentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    const position = e.target.selectionStart || 0
    setNewComment(value)
    setCursorPosition(position)

    // Check if we're in a mention context (after @)
    const textBeforeCursor = value.substring(0, position)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Only show suggestions if there's no space after @ or we're typing a name
      if (!textAfterAt.includes(' ') || textAfterAt.split(' ').length <= 2) {
        setMentionFilter(textAfterAt.toLowerCase())
        setShowMentionSuggestions(true)
      } else {
        setShowMentionSuggestions(false)
      }
    } else {
      setShowMentionSuggestions(false)
    }
  }

  // Filter groups for mention suggestions
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(mentionFilter)
  )

  // Filter members for mention suggestions (include members without name using email)
  const filteredMembers = members.filter(m => {
    const name = m.profile.full_name || m.profile.email || ''
    return name.toLowerCase().includes(mentionFilter)
  })

  // Insert mention
  function insertMention(memberName: string) {
    const textBeforeCursor = newComment.substring(0, cursorPosition)
    const textAfterCursor = newComment.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    const newText = textBeforeCursor.substring(0, lastAtIndex) + '@' + memberName + ' ' + textAfterCursor
    setNewComment(newText)
    setShowMentionSuggestions(false)

    // Focus back on input
    if (commentInputRef.current) {
      commentInputRef.current.focus()
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await addDeviationAttachment(deviation.id, formData)
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className={`text-lg ${severityConfig[deviation.severity].color}`}>
                  {severityConfig[deviation.severity].icon}
                </span>
                <h2 className="text-lg font-semibold text-slate-900">
                  AVV-{String(deviation.deviation_number).padStart(3, '0')}
                </h2>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XIcon />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{deviation.title}</h3>
                {deviation.description && (
                  <p className="text-slate-600">{deviation.description}</p>
                )}
              </div>

              {/* Status & Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select
                    value={deviation.status}
                    onChange={(e) => handleStatusChange(e.target.value as DeviationStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Allvarlighet</label>
                  <div className={`px-3 py-2 rounded-xl bg-slate-50 ${severityConfig[deviation.severity].color}`}>
                    {severityConfig[deviation.severity].icon} {severityConfig[deviation.severity].label}
                  </div>
                </div>
              </div>

              {/* Location & Reference */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {deviation.location && (
                  <div>
                    <span className="text-slate-500">Plats:</span>
                    <span className="text-slate-900 ml-2">{deviation.location}</span>
                  </div>
                )}
                {deviation.drawing_reference && (
                  <div>
                    <span className="text-slate-500">Ritningsref:</span>
                    <span className="text-slate-900 ml-2">{deviation.drawing_reference}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Kategori:</span>
                  <span className="text-slate-900 ml-2">{categoryConfig[deviation.category].label}</span>
                </div>
                {deviation.due_date && (
                  <div>
                    <span className="text-slate-500">Förfaller:</span>
                    <span className="text-slate-900 ml-2">{formatDate(deviation.due_date)}</span>
                  </div>
                )}
              </div>

              {/* People */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Rapporterad av:</span>
                  <span className="text-slate-900 ml-2">{deviation.reporter?.full_name || 'Okänd'}</span>
                </div>
                {deviation.assignee && (
                  <div>
                    <span className="text-slate-500">Ansvarig:</span>
                    <span className="text-slate-900 ml-2">{deviation.assignee.full_name}</span>
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bilagor</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <button
                        onClick={() => handleViewAttachment(att.id)}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        {att.file_name}
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <XIcon />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-pointer transition-colors">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Grundorsak</label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Beskriv grundorsaken till avvikelsen..."
                />
              </div>

              {/* Corrective Action */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Åtgärd</label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Beskriv vilken åtgärd som vidtagits..."
                />
              </div>

              <button
                onClick={handleSaveDetails}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
              >
                {isSaving ? 'Sparar...' : 'Spara ändringar'}
              </button>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Kommentarer</label>
                <div className="space-y-3 mb-4">
                  {comments.length === 0 ? (
                    <p className="text-slate-500 text-sm">Inga kommentarer än.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-slate-900 text-sm font-medium">
                            {(comment as DeviationComment & { author?: { full_name: string } }).author?.full_name || 'Okänd'}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleAddComment} className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={commentInputRef}
                        type="text"
                        value={newComment}
                        onChange={handleCommentChange}
                        placeholder="Skriv en kommentar... (använd @ för att nämna någon)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      {/* Mention suggestions dropdown */}
                      {showMentionSuggestions && (filteredGroups.length > 0 || filteredMembers.length > 0) && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-20">
                          {/* Groups section */}
                          {filteredGroups.length > 0 && (
                            <>
                              <div className="px-3 py-1.5 text-xs font-medium text-slate-500 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                                Grupper
                              </div>
                              {filteredGroups.map((group) => (
                                <button
                                  key={group.id}
                                  type="button"
                                  onClick={() => insertMention(group.name)}
                                  className="w-full px-3 py-2 text-left text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                  <div
                                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium text-white"
                                    style={{ backgroundColor: group.color }}
                                  >
                                    👥
                                  </div>
                                  <span className="flex-1">{group.name}</span>
                                  <span className="text-xs text-slate-500">
                                    {group.member_count} pers
                                  </span>
                                </button>
                              ))}
                            </>
                          )}

                          {/* Separator between groups and members */}
                          {filteredGroups.length > 0 && filteredMembers.length > 0 && (
                            <div className="border-t border-slate-200" />
                          )}

                          {/* Members section */}
                          {filteredMembers.length > 0 && (
                            <>
                              <div className="px-3 py-1.5 text-xs font-medium text-slate-500 border-b border-slate-200 bg-slate-50">
                                Personer
                              </div>
                              {filteredMembers.map((member) => {
                                const displayName = member.profile.full_name || member.profile.email || 'Okänd'
                                return (
                                  <button
                                    key={member.user_id}
                                    type="button"
                                    onClick={() => insertMention(displayName)}
                                    className="w-full px-3 py-2 text-left text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                                      {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{displayName}</span>
                                    {member.group && (
                                      <span
                                        className="px-1.5 py-0.5 rounded text-xs text-white"
                                        style={{ backgroundColor: member.group.color }}
                                      >
                                        {member.group.name}
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={!newComment.trim() || isSubmittingComment}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                    >
                      Skicka
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  const [groups, setGroups] = useState<(ProjectGroup & { member_count: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDeviation, setSelectedDeviation] = useState<DeviationWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState<DeviationStatus | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<DeviationSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<DeviationCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
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
      const [deviationData, statsData, membersData, groupsData] = await Promise.all([
        getProjectDeviations(projectId, {
          status: statusFilter,
          severity: severityFilter,
          category: categoryFilter,
        }),
        getDeviationStats(projectId),
        getProjectMembers(projectId),
        getProjectGroupsWithCounts(projectId)
      ])
      setDeviations(deviationData)
      setStats(statsData)
      setMembers(membersData)
      setGroups(groupsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, statusFilter, severityFilter, categoryFilter])

  // Client-side search filtering
  const filteredDeviations = useMemo(() => {
    if (!searchQuery.trim()) return deviations
    const query = searchQuery.toLowerCase()
    return deviations.filter(deviation =>
      deviation.title.toLowerCase().includes(query) ||
      deviation.description?.toLowerCase().includes(query) ||
      deviation.location?.toLowerCase().includes(query) ||
      deviation.drawing_reference?.toLowerCase().includes(query) ||
      deviation.reporter?.full_name?.toLowerCase().includes(query) ||
      deviation.assignee?.full_name?.toLowerCase().includes(query) ||
      `AVV-${String(deviation.deviation_number).padStart(3, '0')}`.toLowerCase().includes(query)
    )
  }, [deviations, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredDeviations.length / ITEMS_PER_PAGE)
  const paginatedDeviations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredDeviations.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredDeviations, currentPage])

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // PDF Export
  const exportToPDF = useCallback(() => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.setTextColor(79, 70, 229) // Indigo
    doc.text('Avvikelselista (NCR)', 14, 22)

    // Metadata
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text(`Exporterad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 30)
    doc.text(`Totalt: ${filteredDeviations.length} avvikelser`, 14, 36)

    // Table data
    const tableData = filteredDeviations.map(deviation => [
      `AVV-${String(deviation.deviation_number).padStart(3, '0')}`,
      deviation.title,
      statusConfig[deviation.status].label,
      severityConfig[deviation.severity].label,
      categoryConfig[deviation.category].label,
      deviation.location || '-',
      deviation.reporter?.full_name || '-',
      formatDate(deviation.created_at)
    ])

    autoTable(doc, {
      head: [['Nr', 'Titel', 'Status', 'Allvarlighet', 'Kategori', 'Plats', 'Rapportör', 'Skapad']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [99, 102, 241] }, // Indigo-500
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 40 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 22 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 18 }
      }
    })

    doc.save(`avvikelser-${new Date().toISOString().split('T')[0]}.pdf`)
  }, [filteredDeviations])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async (data: CreateDeviationData, files: File[]) => {
    const deviation = await createDeviation(projectId, data)
    // Upload attachments if any
    if (files.length > 0) {
      await Promise.all(files.map(file => {
        const formData = new FormData()
        formData.append('file', file)
        return addDeviationAttachment(deviation.id, formData)
      }))
    }
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
        <motion.div
          className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Avvikelser</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 text-sm sm:text-base"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">Rapportera</span>
          <span className="sm:hidden">Ny</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm"
        >
          <p className="text-slate-500 text-xs">Totalt</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm"
        >
          <p className="text-amber-600 text-xs">Öppna</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.open}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm"
        >
          <p className="text-blue-600 text-xs">Utredning</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.investigating}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm"
        >
          <p className="text-orange-600 text-xs">Åtgärd</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.actionRequired}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm"
        >
          <p className="text-cyan-600 text-xs">Åtgärdade</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.corrected}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm"
        >
          <p className="text-green-600 text-xs">Verifierade</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.verified}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm col-span-2 sm:col-span-1"
        >
          <p className="text-slate-500 text-xs">Stängda</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.closed}</p>
        </motion.div>
      </div>

      {/* Severity Summary */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
        <span className="text-amber-500">○ {stats.bySeverity.minor} mindre</span>
        <span className="text-orange-500">● {stats.bySeverity.major} allvarliga</span>
        <span className="text-red-500">◉ {stats.bySeverity.critical} kritiska</span>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3 mb-4 sm:mb-6">
        {/* Search input */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök avvikelser..."
            className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Filters row on mobile */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeviationStatus | 'all')}
            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            <option value="all">Alla statusar</option>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as DeviationSeverity | 'all')}
            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            <option value="all">Allvarlighet</option>
            {Object.entries(severityConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DeviationCategory | 'all')}
            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            <option value="all">Kategori</option>
            {Object.entries(categoryConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* PDF Export button */}
          <button
            onClick={exportToPDF}
            disabled={filteredDeviations.length === 0}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="hidden sm:inline">Exportera PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {filteredDeviations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-12 text-center shadow-sm"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery
              ? 'Inga avvikelser matchar sökningen'
              : statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all'
              ? 'Inga avvikelser matchar filtret'
              : 'Inga avvikelser än'}
          </h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            {searchQuery
              ? `Inga resultat för "${searchQuery}". Prova en annan sökterm.`
              : statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all'
              ? 'Prova att ändra filter för att se fler avvikelser.'
              : 'Rapportera och spåra avvikelser enligt ISO 9001-standard för kvalitetsstyrning.'}
          </p>
          {!searchQuery && statusFilter === 'all' && severityFilter === 'all' && categoryFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20"
            >
              Rapportera avvikelse
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* Search results info */}
          {searchQuery && (
            <div className="text-xs sm:text-sm text-slate-600">
              Visar {filteredDeviations.length} av {deviations.length} avvikelser för "{searchQuery}"
            </div>
          )}

          {paginatedDeviations.map((deviation, index) => (
            <motion.div
              key={deviation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedDeviation(deviation)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-slate-400 text-sm font-mono">
                      AVV-{String(deviation.deviation_number).padStart(3, '0')}
                    </span>
                    <span className={`text-lg ${severityConfig[deviation.severity].color}`}>
                      {severityConfig[deviation.severity].icon}
                    </span>
                    <h3 className="text-slate-900 font-medium truncate">{deviation.title}</h3>
                  </div>

                  {deviation.description && (
                    <p className="text-slate-500 text-sm mb-3 line-clamp-2">
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
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
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
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDelete(deviation.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Ta bort"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 sm:mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs sm:text-sm text-slate-600 order-2 sm:order-1">
                Visar {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredDeviations.length)} av {filteredDeviations.length}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="hidden sm:flex px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 3) {
                      pageNum = i + 1
                    } else if (currentPage === 1) {
                      pageNum = i + 1
                    } else if (currentPage === totalPages) {
                      pageNum = totalPages - 2 + i
                    } else {
                      pageNum = currentPage - 1 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="hidden sm:flex px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
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
          groups={groups}
        />
      )}
    </motion.div>
  )
}
