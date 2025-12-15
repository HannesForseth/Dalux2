'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getProjectIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  getIssueStats,
  getIssueComments,
  addIssueComment,
  getIssueAttachments,
  addIssueAttachment,
  deleteIssueAttachment,
  getAttachmentDownloadUrl
} from '@/app/actions/issues'
import { getProjectMembers } from '@/app/actions/members'
import { getProjectGroupsWithCounts } from '@/app/actions/groups'
import type {
  IssueWithDetails,
  IssueStatus,
  IssuePriority,
  CreateIssueData,
  IssueComment,
  IssueAttachment,
  ProjectMemberWithDetails,
  ProjectGroup
} from '@/types/database'

const ITEMS_PER_PAGE = 10

const statusConfig: Record<IssueStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Öppen', color: 'text-amber-600', bg: 'bg-amber-100' },
  in_progress: { label: 'Pågående', color: 'text-blue-600', bg: 'bg-blue-100' },
  resolved: { label: 'Löst', color: 'text-green-600', bg: 'bg-green-100' },
  closed: { label: 'Stängd', color: 'text-slate-600', bg: 'bg-slate-100' },
}

const priorityConfig: Record<IssuePriority, { label: string; color: string; icon: string }> = {
  low: { label: 'Låg', color: 'text-slate-500', icon: '↓' },
  medium: { label: 'Medium', color: 'text-amber-500', icon: '→' },
  high: { label: 'Hög', color: 'text-orange-500', icon: '↑' },
  critical: { label: 'Kritisk', color: 'text-red-500', icon: '!' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface CreateIssueModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: CreateIssueData, files: File[]) => Promise<void>
  members: ProjectMemberWithDetails[]
}

function CreateIssueModal({ isOpen, onClose, onCreate, members }: CreateIssueModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('medium')
  const [location, setLocation] = useState('')
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
        priority,
        location: location.trim() || undefined,
        assigned_to: assignedTo || undefined,
        due_date: dueDate || undefined,
      }, files)
      setTitle('')
      setDescription('')
      setPriority('medium')
      setLocation('')
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
              <h2 className="text-lg font-semibold text-slate-900">Nytt ärende</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Beskriv ärendet kort"
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
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Detaljerad beskrivning av problemet..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Prioritet
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as IssuePriority)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(priorityConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plats
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="t.ex. Våning 2, Rum 204"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ansvarig
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Ingen tilldelad</option>
                    {members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.profile.full_name || member.profile.email || 'Okänd'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Förfaller
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      <div
                        key={index}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      >
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
                  {isSubmitting ? 'Skapar...' : 'Skapa ärende'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface IssueDetailModalProps {
  issue: IssueWithDetails
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  members: ProjectMemberWithDetails[]
  groups: (ProjectGroup & { member_count: number })[]
}

function IssueDetailModal({ issue, isOpen, onClose, onUpdate, members, groups }: IssueDetailModalProps) {
  const params = useParams()
  const projectId = params.id as string
  const [comments, setComments] = useState<IssueComment[]>([])
  const [attachments, setAttachments] = useState<IssueAttachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const commentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadComments()
      loadAttachments()
    }
  }, [isOpen, issue.id])

  async function loadComments() {
    const data = await getIssueComments(issue.id)
    setComments(data)
  }

  async function loadAttachments() {
    const data = await getIssueAttachments(issue.id)
    setAttachments(data)
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      await addIssueComment(issue.id, newComment.trim(), {
        members: members.map(m => ({
          user_id: m.user_id,
          full_name: m.profile.full_name || '',
          email: m.profile.email || undefined
        })),
        groups: groups.map(g => ({ id: g.id, name: g.name })),
        issueTitle: issue.title,
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
      await addIssueAttachment(issue.id, file)
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
      await deleteIssueAttachment(attachmentId)
      await loadAttachments()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  async function handleViewAttachment(attachmentId: string) {
    try {
      const url = await getAttachmentDownloadUrl(attachmentId)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to get attachment URL:', error)
    }
  }

  async function handleStatusChange(newStatus: IssueStatus) {
    try {
      await updateIssue(issue.id, { status: newStatus })
      onUpdate()
    } catch (error) {
      console.error('Status update failed:', error)
    }
  }

  async function handlePriorityChange(newPriority: IssuePriority) {
    try {
      await updateIssue(issue.id, { priority: newPriority })
      onUpdate()
    } catch (error) {
      console.error('Priority update failed:', error)
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
                <span className={`text-lg ${priorityConfig[issue.priority].color}`}>
                  {priorityConfig[issue.priority].icon}
                </span>
                <h2 className="text-lg font-semibold text-slate-900">Ärende</h2>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XIcon />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{issue.title}</h3>
                {issue.description && (
                  <p className="text-slate-600">{issue.description}</p>
                )}
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Prioritet</label>
                  <select
                    value={issue.priority}
                    onChange={(e) => handlePriorityChange(e.target.value as IssuePriority)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(priorityConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {issue.location && (
                  <div>
                    <span className="text-slate-500">Plats:</span>
                    <span className="text-slate-900 ml-2">{issue.location}</span>
                  </div>
                )}
                {issue.due_date && (
                  <div>
                    <span className="text-slate-500">Förfaller:</span>
                    <span className="text-slate-900 ml-2">{formatDate(issue.due_date)}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Skapad:</span>
                  <span className="text-slate-900 ml-2">{formatDate(issue.created_at)}</span>
                </div>
                {issue.resolved_at && (
                  <div>
                    <span className="text-slate-500">Löst:</span>
                    <span className="text-slate-900 ml-2">{formatDate(issue.resolved_at)}</span>
                  </div>
                )}
              </div>

              {/* People */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Rapporterad av:</span>
                  <span className="text-slate-900 ml-2">{issue.reporter?.full_name || 'Okänd'}</span>
                </div>
                {issue.assignee && (
                  <div>
                    <span className="text-slate-500">Ansvarig:</span>
                    <span className="text-slate-900 ml-2">{issue.assignee.full_name}</span>
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
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                      <button
                        onClick={() => handleViewAttachment(att.id)}
                        className="text-indigo-600 hover:text-indigo-500"
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
                  {attachments.length === 0 && (
                    <span className="text-slate-500 text-sm">Inga bilagor</span>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-pointer transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  {isUploading ? 'Laddar upp...' : '+ Lägg till bilaga'}
                </label>
              </div>

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
                            {(comment as IssueComment & { author?: { full_name: string } }).author?.full_name || 'Okänd'}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm">{comment.content}</p>
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
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      {/* Mention suggestions dropdown */}
                      {showMentionSuggestions && (filteredGroups.length > 0 || filteredMembers.length > 0) && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-20">
                          {/* Groups section */}
                          {filteredGroups.length > 0 && (
                            <>
                              <div className="px-3 py-1.5 text-xs font-medium text-slate-500 border-b border-slate-200 bg-slate-50">
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
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
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

export default function ProjectIssuesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  const [issues, setIssues] = useState<IssueWithDetails[]>([])
  const [members, setMembers] = useState<ProjectMemberWithDetails[]>([])
  const [groups, setGroups] = useState<(ProjectGroup & { member_count: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<IssueWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | 'all'>('all')
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter issues by search query (client-side)
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues
    const query = searchQuery.toLowerCase()
    return issues.filter(issue =>
      issue.title.toLowerCase().includes(query) ||
      issue.description?.toLowerCase().includes(query) ||
      issue.location?.toLowerCase().includes(query) ||
      issue.reporter?.full_name?.toLowerCase().includes(query) ||
      issue.assignee?.full_name?.toLowerCase().includes(query)
    )
  }, [issues, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE)
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredIssues.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredIssues, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, priorityFilter, searchQuery])

  // PDF Export function
  const exportToPDF = useCallback(() => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.text('Ärendelista', 14, 22)
    doc.setFontSize(10)
    doc.text(`Exporterad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 30)
    doc.text(`Totalt: ${filteredIssues.length} ärenden`, 14, 36)

    // Table data
    const tableData = filteredIssues.map(issue => [
      issue.title,
      statusConfig[issue.status].label,
      priorityConfig[issue.priority].label,
      issue.location || '-',
      issue.reporter?.full_name || '-',
      issue.assignee?.full_name || '-',
      formatDate(issue.created_at)
    ])

    autoTable(doc, {
      head: [['Titel', 'Status', 'Prioritet', 'Plats', 'Rapportör', 'Ansvarig', 'Skapad']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    })

    doc.save(`arenden-${new Date().toISOString().split('T')[0]}.pdf`)
  }, [filteredIssues])

  const loadData = useCallback(async () => {
    try {
      const [issueData, statsData, membersData, groupsData] = await Promise.all([
        getProjectIssues(projectId, {
          status: statusFilter,
          priority: priorityFilter,
        }),
        getIssueStats(projectId),
        getProjectMembers(projectId),
        getProjectGroupsWithCounts(projectId)
      ])
      setIssues(issueData)
      setStats(statsData)
      setMembers(membersData)
      setGroups(groupsData)

      // Check if we should open a specific issue from URL
      const openIssueId = searchParams.get('open')
      if (openIssueId) {
        const issueToOpen = issueData.find(i => i.id === openIssueId)
        if (issueToOpen) {
          setSelectedIssue(issueToOpen)
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, statusFilter, priorityFilter, searchParams])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async (data: CreateIssueData, files: File[]) => {
    const issue = await createIssue(projectId, data)
    // Upload attachments if any
    if (files.length > 0) {
      await Promise.all(files.map(file => addIssueAttachment(issue.id, file)))
    }
    await loadData()
  }

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    try {
      await updateIssue(issueId, { status: newStatus })
      await loadData()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async (issueId: string) => {
    if (!confirm('Är du säker på att du vill ta bort detta ärende?')) return

    try {
      await deleteIssue(issueId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete issue:', error)
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
    <div>
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ärenden</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 text-sm sm:text-base"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">Nytt ärende</span>
          <span className="sm:hidden">Nytt</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm"
        >
          <p className="text-slate-500 text-xs sm:text-sm">Totalt</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm"
        >
          <p className="text-amber-600 text-xs sm:text-sm">Öppna</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.open}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm"
        >
          <p className="text-blue-600 text-xs sm:text-sm">Pågående</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.inProgress}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm"
        >
          <p className="text-green-600 text-xs sm:text-sm">Lösta</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.resolved}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm col-span-2 sm:col-span-1"
        >
          <p className="text-slate-500 text-xs sm:text-sm">Stängda</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.closed}</p>
        </motion.div>
      </div>

      {/* Search, Filters & Export */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3 mb-4 sm:mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Sök ärenden..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
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
            onChange={(e) => setStatusFilter(e.target.value as IssueStatus | 'all')}
            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            <option value="all">Alla statusar</option>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as IssuePriority | 'all')}
            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            <option value="all">Alla prioriteter</option>
            {Object.entries(priorityConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Export PDF Button */}
          <button
            onClick={exportToPDF}
            disabled={filteredIssues.length === 0}
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

      {/* Search results info */}
      {searchQuery && (
        <div className="mb-4 text-sm text-slate-600">
          Visar {filteredIssues.length} av {issues.length} ärenden för "{searchQuery}"
        </div>
      )}

      {filteredIssues.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-12 text-center shadow-sm"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Inga ärenden matchar sökningen'
              : 'Inga ärenden än'}
          </h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Prova att ändra sök eller filter för att se fler ärenden.'
              : 'Skapa ärenden för att spåra problem, frågor och observationer i projektet.'}
          </p>
          {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20"
            >
              Skapa ärende
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {paginatedIssues.map((issue, index) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedIssue(issue)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-lg ${priorityConfig[issue.priority].color}`}>
                      {priorityConfig[issue.priority].icon}
                    </span>
                    <h3 className="text-slate-900 font-medium truncate">{issue.title}</h3>
                  </div>

                  {issue.description && (
                    <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                      {issue.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className={`px-2 py-0.5 rounded-full ${statusConfig[issue.status].bg} ${statusConfig[issue.status].color} font-medium`}>
                      {statusConfig[issue.status].label}
                    </span>

                    <span className={`${priorityConfig[issue.priority].color}`}>
                      {priorityConfig[issue.priority].label} prioritet
                    </span>

                    {issue.location && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {issue.location}
                      </span>
                    )}

                    <span className="text-slate-500">
                      {formatDate(issue.created_at)}
                    </span>

                    {issue.reporter && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                          {issue.reporter.full_name?.charAt(0) || '?'}
                        </div>
                        {issue.reporter.full_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Status change dropdown */}
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDelete(issue.id)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <p className="text-xs sm:text-sm text-slate-600 order-2 sm:order-1">
                Visar {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredIssues.length)} av {filteredIssues.length}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
                  className="px-2 sm:px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <CreateIssueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        members={members}
      />

      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          isOpen={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdate={() => {
            loadData()
            // Refresh selected issue
            const updated = issues.find(i => i.id === selectedIssue.id)
            if (updated) setSelectedIssue(updated)
          }}
          members={members}
          groups={groups}
        />
      )}
    </div>
  )
}
