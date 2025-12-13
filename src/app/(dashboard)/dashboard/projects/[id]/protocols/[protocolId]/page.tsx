'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  getProtocol,
  updateProtocol,
  finalizeProtocol,
  addAttendee,
  removeAttendee,
  updateAttendee,
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  addDecision,
  deleteDecision,
  addActionItem,
  updateActionItem,
  deleteActionItem,
  addLink,
  removeLink,
  getProtocolAttachments,
  addProtocolAttachment,
  deleteProtocolAttachment,
  getProtocolAttachmentUrl,
  markProtocolAsViewed
} from '@/app/actions/protocols'
import { getProjectMembers } from '@/app/actions/members'
import { getProjectIssues } from '@/app/actions/issues'
import { getProjectDeviations } from '@/app/actions/deviations'
import { saveProtocolAsTemplate } from '@/app/actions/protocol-templates'
import type {
  ProtocolWithDetails,
  ProtocolStatus,
  ProtocolMeetingType,
  ProtocolAttendeeRole,
  ProtocolActionItemStatus,
  ProtocolActionItemPriority,
  ProtocolLinkType,
  ProjectMemberWithDetails,
  ProtocolAttachment,
  IssueWithDetails,
  DeviationWithDetails
} from '@/types/database'

type TabType = 'overview' | 'attendees' | 'agenda' | 'notes' | 'decisions' | 'actions' | 'links' | 'attachments'

const statusConfig: Record<ProtocolStatus, { label: string; color: string; bg: string; icon: string }> = {
  draft: { label: 'Utkast', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: '✏️' },
  finalized: { label: 'Slutfört', color: 'text-green-400', bg: 'bg-green-400/10', icon: '✅' },
  archived: { label: 'Arkiverat', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: '📦' },
}

const meetingTypeConfig: Record<ProtocolMeetingType, { label: string; color: string; bg: string; icon: string }> = {
  byggmote: { label: 'Byggmöte', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '🏗️' },
  projektmote: { label: 'Projektmöte', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: '📊' },
  samordningsmote: { label: 'Samordningsmöte', color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: '🤝' },
  startmote: { label: 'Startmöte', color: 'text-green-400', bg: 'bg-green-500/10', icon: '🚀' },
  slutmote: { label: 'Slutmöte', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '🏁' },
  besiktning: { label: 'Besiktning', color: 'text-red-400', bg: 'bg-red-500/10', icon: '🔍' },
  other: { label: 'Övrigt', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: '📋' },
}

const attendeeRoleConfig: Record<ProtocolAttendeeRole, { label: string; icon: string }> = {
  organizer: { label: 'Organisatör', icon: '👑' },
  recorder: { label: 'Protokollförare', icon: '📝' },
  attendee: { label: 'Deltagare', icon: '👤' },
  absent_notified: { label: 'Frånvarande', icon: '❌' },
}

const actionStatusConfig: Record<ProtocolActionItemStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Ej påbörjad', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: '⏳' },
  in_progress: { label: 'Pågående', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: '🔄' },
  completed: { label: 'Slutförd', color: 'text-green-400', bg: 'bg-green-400/10', icon: '✅' },
  cancelled: { label: 'Avbruten', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: '⛔' },
}

const actionPriorityConfig: Record<ProtocolActionItemPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Låg', color: 'text-slate-400', bg: 'bg-slate-400/20' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
  high: { label: 'Hög', color: 'text-orange-400', bg: 'bg-orange-400/20' },
  critical: { label: 'Kritisk', color: 'text-red-400', bg: 'bg-red-400/20' },
}

const linkTypeConfig: Record<ProtocolLinkType, { label: string; icon: string }> = {
  issue: { label: 'Ärende', icon: '📌' },
  deviation: { label: 'Avvikelse', icon: '⚠️' },
  rfi: { label: 'RFI', icon: '❓' },
  checklist: { label: 'Checklista', icon: '☑️' },
  document: { label: 'Dokument', icon: '📄' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(timeString: string | null): string {
  if (!timeString) return ''
  return timeString.substring(0, 5)
}

// Icons
function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

export default function ProtocolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const protocolId = params.protocolId as string

  const [protocol, setProtocol] = useState<ProtocolWithDetails | null>(null)
  const [members, setMembers] = useState<ProjectMemberWithDetails[]>([])
  const [issues, setIssues] = useState<IssueWithDetails[]>([])
  const [deviations, setDeviations] = useState<DeviationWithDetails[]>([])
  const [attachments, setAttachments] = useState<ProtocolAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Form states
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [showAddAttendee, setShowAddAttendee] = useState(false)
  const [showAddAgenda, setShowAddAgenda] = useState(false)
  const [showAddDecision, setShowAddDecision] = useState(false)
  const [showAddAction, setShowAddAction] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [protocolData, membersData, issuesData, deviationsData, attachmentsData] = await Promise.all([
        getProtocol(protocolId),
        getProjectMembers(projectId),
        getProjectIssues(projectId),
        getProjectDeviations(projectId),
        getProtocolAttachments(protocolId)
      ])

      if (!protocolData) {
        router.push(`/dashboard/projects/${projectId}/protocols`)
        return
      }

      setProtocol(protocolData)
      setMembers(membersData)
      setIssues(issuesData)
      setDeviations(deviationsData)
      setAttachments(attachmentsData)
      setNotesValue(protocolData.notes || '')

      // Markera protokollet som sett (för "olästa protokoll"-räknaren)
      markProtocolAsViewed(protocolId)
    } catch (error) {
      console.error('Failed to load protocol:', error)
    } finally {
      setIsLoading(false)
    }
  }, [protocolId, projectId, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculate completion percentage
  const calculateCompletion = (): number => {
    if (!protocol) return 0
    let completed = 0
    let total = 0

    // Has attendees
    total++
    if ((protocol.attendees?.length || 0) > 0) completed++

    // Has agenda
    total++
    if ((protocol.agenda_items?.length || 0) > 0) completed++

    // Has notes
    total++
    if (protocol.notes && protocol.notes.length > 0) completed++

    // Has decisions OR actions
    total++
    if ((protocol.decisions?.length || 0) > 0 || (protocol.action_items?.length || 0) > 0) completed++

    return Math.round((completed / total) * 100)
  }

  // Save notes
  const handleSaveNotes = async () => {
    if (!protocol) return
    setIsSaving(true)
    try {
      await updateProtocol(protocolId, { notes: notesValue })
      setProtocol(prev => prev ? { ...prev, notes: notesValue } : null)
      setEditingNotes(false)
    } finally {
      setIsSaving(false)
    }
  }

  // Generate AI Summary
  const handleGenerateSummary = async () => {
    if (!protocol) return
    setIsGeneratingSummary(true)
    try {
      const response = await fetch('/api/ai/protocol-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: protocol.notes,
          agenda_items: protocol.agenda_items,
          decisions: protocol.decisions,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        await updateProtocol(protocolId, { ai_summary: data.summary })
        setProtocol(prev => prev ? { ...prev, ai_summary: data.summary } : null)
      }
    } catch (error) {
      console.error('Failed to generate summary:', error)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Finalize protocol
  const handleFinalize = async () => {
    if (!protocol || protocol.status !== 'draft') return
    if (!confirm('Är du säker på att du vill slutföra protokollet? Detta går inte att ångra.')) return

    try {
      await finalizeProtocol(protocolId)
      await loadData()
    } catch (error) {
      console.error('Failed to finalize protocol:', error)
    }
  }

  // Add attendee
  const handleAddAttendee = async (data: { user_id?: string; name: string; email?: string; company?: string; role: ProtocolAttendeeRole }) => {
    try {
      const newAttendee = await addAttendee(protocolId, data)
      // Update state directly for immediate UI feedback
      setProtocol(prev => prev ? {
        ...prev,
        attendees: [...(prev.attendees || []), { ...newAttendee, profile: null }]
      } : null)
      setShowAddAttendee(false)
    } catch (error) {
      console.error('Failed to add attendee:', error)
    }
  }

  // Toggle attendance
  const handleToggleAttendance = async (attendeeId: string, attended: boolean) => {
    try {
      await updateAttendee(attendeeId, { attended })
      // Update state directly
      setProtocol(prev => prev ? {
        ...prev,
        attendees: prev.attendees?.map(a => a.id === attendeeId ? { ...a, attended } : a) || []
      } : null)
    } catch (error) {
      console.error('Failed to update attendance:', error)
    }
  }

  // Remove attendee
  const handleRemoveAttendee = async (attendeeId: string) => {
    if (!confirm('Ta bort denna deltagare?')) return
    try {
      await removeAttendee(attendeeId)
      // Update state directly
      setProtocol(prev => prev ? {
        ...prev,
        attendees: prev.attendees?.filter(a => a.id !== attendeeId) || []
      } : null)
    } catch (error) {
      console.error('Failed to remove attendee:', error)
    }
  }

  // Add agenda item
  const handleAddAgendaItem = async (data: { title: string; description?: string; duration_minutes?: number }) => {
    try {
      const nextOrder = (protocol?.agenda_items?.length || 0) + 1
      const newItem = await addAgendaItem(protocolId, { ...data, order_index: nextOrder })
      // Update state directly for immediate UI feedback
      setProtocol(prev => prev ? {
        ...prev,
        agenda_items: [...(prev.agenda_items || []), { ...newItem, presenter: null }]
      } : null)
      setShowAddAgenda(false)
    } catch (error) {
      console.error('Failed to add agenda item:', error)
    }
  }

  // Delete agenda item
  const handleDeleteAgendaItem = async (itemId: string) => {
    if (!confirm('Ta bort denna punkt?')) return
    try {
      await deleteAgendaItem(itemId)
      // Update state directly
      setProtocol(prev => prev ? {
        ...prev,
        agenda_items: prev.agenda_items?.filter(a => a.id !== itemId) || []
      } : null)
    } catch (error) {
      console.error('Failed to delete agenda item:', error)
    }
  }

  // Add decision
  const handleAddDecision = async (description: string) => {
    try {
      const newDecision = await addDecision(protocolId, { description })
      // Update state directly for immediate UI feedback
      setProtocol(prev => prev ? {
        ...prev,
        decisions: [...(prev.decisions || []), newDecision]
      } : null)
      setShowAddDecision(false)
    } catch (error) {
      console.error('Failed to add decision:', error)
    }
  }

  // Delete decision
  const handleDeleteDecision = async (decisionId: string) => {
    if (!confirm('Ta bort detta beslut?')) return
    try {
      await deleteDecision(decisionId)
      // Update state directly
      setProtocol(prev => prev ? {
        ...prev,
        decisions: prev.decisions?.filter(d => d.id !== decisionId) || []
      } : null)
    } catch (error) {
      console.error('Failed to delete decision:', error)
    }
  }

  // Add action item
  const handleAddActionItem = async (data: { description: string; assigned_to?: string; assigned_to_name?: string; deadline?: string; priority: ProtocolActionItemPriority }) => {
    try {
      const newAction = await addActionItem(protocolId, data)
      // Update state directly for immediate UI feedback
      setProtocol(prev => prev ? {
        ...prev,
        action_items: [...(prev.action_items || []), { ...newAction, assignee: null }]
      } : null)
      setShowAddAction(false)
    } catch (error) {
      console.error('Failed to add action item:', error)
    }
  }

  // Update action item status
  const handleUpdateActionStatus = async (actionId: string, status: ProtocolActionItemStatus) => {
    try {
      await updateActionItem(actionId, { status })
      // Update state directly
      setProtocol(prev => prev ? {
        ...prev,
        action_items: prev.action_items?.map(a => a.id === actionId ? { ...a, status } : a) || []
      } : null)
    } catch (error) {
      console.error('Failed to update action status:', error)
    }
  }

  // Delete action item
  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Ta bort denna åtgärd?')) return
    try {
      await deleteActionItem(actionId)
      // Update state directly
      setProtocol(prev => prev ? {
        ...prev,
        action_items: prev.action_items?.filter(a => a.id !== actionId) || []
      } : null)
    } catch (error) {
      console.error('Failed to delete action:', error)
    }
  }

  // Add link
  const handleAddLink = async (data: { link_type: ProtocolLinkType; linked_item_id: string }) => {
    try {
      const newLink = await addLink(protocolId, data)
      // Update state directly
      setProtocol(prev => prev ? {
        ...prev,
        links: [...(prev.links || []), newLink]
      } : null)
      setShowAddLink(false)
    } catch (error) {
      console.error('Failed to add link:', error)
    }
  }

  // Remove link
  const handleRemoveLink = async (linkId: string) => {
    if (!confirm('Ta bort denna koppling?')) return
    try {
      await removeLink(linkId)
      // Update state directly
      setProtocol(prev => prev ? {
        ...prev,
        links: prev.links?.filter(l => l.id !== linkId) || []
      } : null)
    } catch (error) {
      console.error('Failed to remove link:', error)
    }
  }

  // Upload attachment
  const handleUploadAttachment = async (file: File) => {
    try {
      await addProtocolAttachment(protocolId, file, projectId)
      const newAttachments = await getProtocolAttachments(protocolId)
      setAttachments(newAttachments)
    } catch (error) {
      console.error('Failed to upload attachment:', error)
    }
  }

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Ta bort denna bilaga?')) return
    try {
      await deleteProtocolAttachment(attachmentId)
      const newAttachments = await getProtocolAttachments(protocolId)
      setAttachments(newAttachments)
    } catch (error) {
      console.error('Failed to delete attachment:', error)
    }
  }

  // View attachment
  const handleViewAttachment = async (filePath: string) => {
    try {
      const url = await getProtocolAttachmentUrl(filePath)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to get attachment URL:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!protocol) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Protokollet hittades inte.</p>
      </div>
    )
  }

  const isEditable = protocol.status === 'draft'
  const completionPercent = calculateCompletion()
  const typeConfig = meetingTypeConfig[protocol.meeting_type]

  const tabs: { id: TabType; label: string; count?: number; icon: string }[] = [
    { id: 'overview', label: 'Översikt', icon: '📋' },
    { id: 'attendees', label: 'Deltagare', count: protocol.attendees?.length || 0, icon: '👥' },
    { id: 'agenda', label: 'Dagordning', count: protocol.agenda_items?.length || 0, icon: '📝' },
    { id: 'notes', label: 'Anteckningar', icon: '📄' },
    { id: 'decisions', label: 'Beslut', count: protocol.decisions?.length || 0, icon: '⚖️' },
    { id: 'actions', label: 'Åtgärder', count: protocol.action_items?.length || 0, icon: '✅' },
    { id: 'links', label: 'Kopplingar', count: protocol.links?.length || 0, icon: '🔗' },
    { id: 'attachments', label: 'Bilagor', count: attachments.length, icon: '📎' },
  ]

  return (
    <div className="max-w-5xl mx-auto relative pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm pb-4 -mx-4 px-4">
        {/* Top row */}
        <div className="flex items-start justify-between py-4">
          <div className="flex items-start gap-4">
            <Link
              href={`/dashboard/projects/${projectId}/protocols`}
              className="mt-1 text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
            >
              <ArrowLeftIcon />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{typeConfig.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-mono text-sm">#{protocol.protocol_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[protocol.status].bg} ${statusConfig[protocol.status].color}`}>
                      {statusConfig[protocol.status].icon} {statusConfig[protocol.status].label}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-white">{protocol.title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400 ml-12">
                <span className={typeConfig.color}>{typeConfig.label}</span>
                <span>📅 {formatDate(protocol.meeting_date)}</span>
                {protocol.start_time && (
                  <span>🕐 {formatTime(protocol.start_time)}{protocol.end_time && ` - ${formatTime(protocol.end_time)}`}</span>
                )}
                {protocol.location && <span>📍 {protocol.location}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress indicator */}
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">Ifylld</div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${completionPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className={`text-sm font-medium ${completionPercent === 100 ? 'text-green-400' : 'text-slate-400'}`}>
                  {completionPercent}%
                </span>
              </div>
            </div>

            {/* Save as Template button */}
            <button
              onClick={() => setShowSaveAsTemplate(true)}
              className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg font-medium hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
              title="Spara som mall"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
              </svg>
              <span className="hidden sm:inline">Spara som mall</span>
            </button>

            {isEditable && (
              <button
                onClick={handleFinalize}
                disabled={completionPercent < 50}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                ✅ Slutför
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-500' : 'bg-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('attendees')}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="text-2xl font-bold text-white">{protocol.attendees?.length || 0}</div>
                <div className="text-sm text-slate-400">Deltagare</div>
                <div className="text-xs text-slate-500 mt-1">
                  {protocol.attendees?.filter(a => a.attended).length || 0} närvarande
                </div>
              </button>
              <button
                onClick={() => setActiveTab('agenda')}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors"
              >
                <div className="text-2xl mb-2">📝</div>
                <div className="text-2xl font-bold text-white">{protocol.agenda_items?.length || 0}</div>
                <div className="text-sm text-slate-400">Punkter</div>
                <div className="text-xs text-slate-500 mt-1">
                  {protocol.agenda_items?.reduce((acc, item) => acc + (item.duration_minutes || 0), 0) || 0} min totalt
                </div>
              </button>
              <button
                onClick={() => setActiveTab('decisions')}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors"
              >
                <div className="text-2xl mb-2">⚖️</div>
                <div className="text-2xl font-bold text-white">{protocol.decisions?.length || 0}</div>
                <div className="text-sm text-slate-400">Beslut</div>
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors"
              >
                <div className="text-2xl mb-2">✅</div>
                <div className="text-2xl font-bold text-white">{protocol.action_items?.length || 0}</div>
                <div className="text-sm text-slate-400">Åtgärder</div>
                <div className="text-xs text-slate-500 mt-1">
                  {protocol.action_items?.filter(a => a.status === 'completed').length || 0} slutförda
                </div>
              </button>
            </div>

            {/* AI Summary or Quick Overview */}
            {protocol.ai_summary ? (
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">✨</span>
                  <h3 className="text-lg font-semibold text-white">AI-sammanfattning</h3>
                </div>
                <p className="text-slate-300">{protocol.ai_summary}</p>
              </div>
            ) : protocol.notes ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Anteckningar</h3>
                  {isEditable && (
                    <button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm disabled:opacity-50"
                    >
                      ✨ {isGeneratingSummary ? 'Genererar...' : 'Generera AI-sammanfattning'}
                    </button>
                  )}
                </div>
                <p className="text-slate-300 line-clamp-4">{protocol.notes}</p>
                <button
                  onClick={() => setActiveTab('notes')}
                  className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                >
                  Läs mer →
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">📝</div>
                <h3 className="text-lg font-semibold text-white mb-2">Inga anteckningar än</h3>
                <p className="text-slate-400 text-sm mb-4">Börja dokumentera mötet genom att lägga till anteckningar</p>
                {isEditable && (
                  <button
                    onClick={() => {
                      setActiveTab('notes')
                      setEditingNotes(true)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    Lägg till anteckningar
                  </button>
                )}
              </div>
            )}

            {/* Recent Actions */}
            {(protocol.action_items?.length || 0) > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Senaste åtgärder</h3>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Visa alla →
                  </button>
                </div>
                <div className="space-y-3">
                  {protocol.action_items?.slice(0, 3).map((action) => (
                    <div key={action.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                      <span className={`px-2 py-1 rounded-full text-xs ${actionStatusConfig[action.status].bg} ${actionStatusConfig[action.status].color}`}>
                        {actionStatusConfig[action.status].icon}
                      </span>
                      <div className="flex-1">
                        <p className="text-white text-sm">{action.description}</p>
                        {action.assigned_to_name && (
                          <span className="text-xs text-slate-500">→ {action.assigned_to_name}</span>
                        )}
                      </div>
                      {action.deadline && (
                        <span className="text-xs text-slate-500">{formatDate(action.deadline)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attendees Tab */}
        {activeTab === 'attendees' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Deltagare</h3>
              {isEditable && !showAddAttendee && (
                <button
                  onClick={() => setShowAddAttendee(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                >
                  <PlusIcon /> Lägg till
                </button>
              )}
            </div>

            {showAddAttendee && (
              <div className="mb-6">
                <AddAttendeeForm
                  members={members}
                  onSubmit={handleAddAttendee}
                  onCancel={() => setShowAddAttendee(false)}
                />
              </div>
            )}

            <div className="grid gap-3">
              {protocol.attendees?.map((attendee) => (
                <div key={attendee.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => isEditable && handleToggleAttendance(attendee.id, !attendee.attended)}
                      disabled={!isEditable}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
                        attendee.attended
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {attendee.attended ? '✓' : '—'}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{attendee.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                          {attendeeRoleConfig[attendee.role].icon} {attendeeRoleConfig[attendee.role].label}
                        </span>
                      </div>
                      {(attendee.company || attendee.email) && (
                        <div className="text-sm text-slate-500">
                          {attendee.company}{attendee.company && attendee.email && ' • '}{attendee.email}
                        </div>
                      )}
                    </div>
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => handleRemoveAttendee(attendee.id)}
                      className="text-slate-500 hover:text-red-400 p-2"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
              {(protocol.attendees?.length || 0) === 0 && !showAddAttendee && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">👥</div>
                  <p>Inga deltagare tillagda</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agenda Tab */}
        {activeTab === 'agenda' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Dagordning</h3>
              {isEditable && !showAddAgenda && (
                <button
                  onClick={() => setShowAddAgenda(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                >
                  <PlusIcon /> Lägg till punkt
                </button>
              )}
            </div>

            {showAddAgenda && (
              <div className="mb-6">
                <AddAgendaForm
                  onSubmit={handleAddAgendaItem}
                  onCancel={() => setShowAddAgenda(false)}
                />
              </div>
            )}

            <div className="space-y-3">
              {protocol.agenda_items?.sort((a, b) => a.order_index - b.order_index).map((item, index) => (
                <div key={item.id} className="flex items-start gap-4 p-4 bg-slate-800 rounded-lg group">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{item.title}</h4>
                    {item.description && (
                      <p className="text-slate-400 text-sm mt-1">{item.description}</p>
                    )}
                    {item.duration_minutes && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 mt-2">
                        🕐 {item.duration_minutes} min
                      </span>
                    )}
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => handleDeleteAgendaItem(item.id)}
                      className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
              {(protocol.agenda_items?.length || 0) === 0 && !showAddAgenda && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">📝</div>
                  <p>Ingen dagordning skapad</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Anteckningar</h3>
              {isEditable && !editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Redigera
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-4">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Skriv mötesanteckningar..."
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setNotesValue(protocol.notes || '')
                      setEditingNotes(false)
                    }}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSaving ? 'Sparar...' : 'Spara'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {protocol.notes ? (
                  <pre className="whitespace-pre-wrap text-slate-300 font-sans text-sm bg-slate-800 p-4 rounded-lg">
                    {protocol.notes}
                  </pre>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-4xl mb-2">📄</div>
                    <p>Inga anteckningar än</p>
                    {isEditable && (
                      <button
                        onClick={() => setEditingNotes(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                      >
                        Lägg till anteckningar
                      </button>
                    )}
                  </div>
                )}

                {/* AI Summary Section */}
                {protocol.ai_summary && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span>✨</span>
                      <h4 className="text-blue-400 font-medium">AI-sammanfattning</h4>
                    </div>
                    <p className="text-slate-300 text-sm">{protocol.ai_summary}</p>
                  </div>
                )}

                {isEditable && protocol.notes && !protocol.ai_summary && (
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 disabled:opacity-50"
                  >
                    ✨ {isGeneratingSummary ? 'Genererar...' : 'Generera AI-sammanfattning'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Decisions Tab */}
        {activeTab === 'decisions' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Beslut</h3>
              {isEditable && !showAddDecision && (
                <button
                  onClick={() => setShowAddDecision(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                >
                  <PlusIcon /> Lägg till beslut
                </button>
              )}
            </div>

            {showAddDecision && (
              <div className="mb-6">
                <AddDecisionForm
                  onSubmit={handleAddDecision}
                  onCancel={() => setShowAddDecision(false)}
                />
              </div>
            )}

            <div className="space-y-3">
              {protocol.decisions?.map((decision) => (
                <div key={decision.id} className="flex items-start gap-4 p-4 bg-slate-800 rounded-lg group">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-mono text-sm flex-shrink-0">
                    B{decision.decision_number}
                  </div>
                  <div className="flex-1">
                    <p className="text-white">{decision.description}</p>
                    {decision.decided_by && (
                      <span className="text-xs text-slate-500 mt-1 block">Beslutat av: {decision.decided_by}</span>
                    )}
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => handleDeleteDecision(decision.id)}
                      className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
              {(protocol.decisions?.length || 0) === 0 && !showAddDecision && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">⚖️</div>
                  <p>Inga beslut dokumenterade</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Åtgärdspunkter</h3>
              {isEditable && !showAddAction && (
                <button
                  onClick={() => setShowAddAction(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                >
                  <PlusIcon /> Lägg till åtgärd
                </button>
              )}
            </div>

            {showAddAction && (
              <div className="mb-6">
                <AddActionForm
                  members={members}
                  onSubmit={handleAddActionItem}
                  onCancel={() => setShowAddAction(false)}
                />
              </div>
            )}

            <div className="space-y-3">
              {protocol.action_items?.map((action) => (
                <div key={action.id} className="p-4 bg-slate-800 rounded-lg group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-orange-400 font-mono text-sm bg-orange-500/10 px-2 py-1 rounded">
                        Å{action.action_number}
                      </span>
                      <div className="flex-1">
                        <p className="text-white mb-2">{action.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${actionStatusConfig[action.status].bg} ${actionStatusConfig[action.status].color}`}>
                            {actionStatusConfig[action.status].icon} {actionStatusConfig[action.status].label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${actionPriorityConfig[action.priority].bg} ${actionPriorityConfig[action.priority].color}`}>
                            {actionPriorityConfig[action.priority].label}
                          </span>
                          {action.assigned_to_name && (
                            <span className="text-xs text-slate-400">👤 {action.assigned_to_name}</span>
                          )}
                          {action.deadline && (
                            <span className="text-xs text-slate-400">📅 {formatDate(action.deadline)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={action.status}
                        onChange={(e) => handleUpdateActionStatus(action.id, e.target.value as ProtocolActionItemStatus)}
                        className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        {Object.entries(actionStatusConfig).map(([key, { label }]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      {isEditable && (
                        <button
                          onClick={() => handleDeleteAction(action.id)}
                          className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(protocol.action_items?.length || 0) === 0 && !showAddAction && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>Inga åtgärder tillagda</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Links Tab */}
        {activeTab === 'links' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Kopplingar</h3>
              {isEditable && !showAddLink && (
                <button
                  onClick={() => setShowAddLink(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                >
                  <PlusIcon /> Lägg till koppling
                </button>
              )}
            </div>

            {showAddLink && (
              <div className="mb-6">
                <AddLinkForm
                  issues={issues}
                  deviations={deviations}
                  onSubmit={handleAddLink}
                  onCancel={() => setShowAddLink(false)}
                />
              </div>
            )}

            <div className="space-y-3">
              {protocol.links?.map((link) => {
                const linkedItem = link.link_type === 'issue'
                  ? issues.find(i => i.id === link.linked_item_id)
                  : link.link_type === 'deviation'
                  ? deviations.find(d => d.id === link.linked_item_id)
                  : null

                return (
                  <div key={link.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{linkTypeConfig[link.link_type].icon}</span>
                      <div>
                        <span className="text-xs text-slate-500 block">{linkTypeConfig[link.link_type].label}</span>
                        <span className="text-white">{linkedItem?.title || link.linked_item_id}</span>
                      </div>
                    </div>
                    {isEditable && (
                      <button
                        onClick={() => handleRemoveLink(link.id)}
                        className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>
                )
              })}
              {(protocol.links?.length || 0) === 0 && !showAddLink && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">🔗</div>
                  <p>Inga kopplingar till andra objekt</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attachments Tab */}
        {activeTab === 'attachments' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Bilagor</h3>
              {isEditable && (
                <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadAttachment(file)
                    }}
                  />
                  <PlusIcon /> Ladda upp
                </label>
              )}
            </div>

            <div className="grid gap-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg group">
                  <button
                    onClick={() => handleViewAttachment(attachment.file_path)}
                    className="flex items-center gap-3 text-left hover:text-blue-400 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-xl">
                      📎
                    </div>
                    <div>
                      <span className="text-white block">{attachment.file_name}</span>
                      {attachment.file_size && (
                        <span className="text-xs text-slate-500">{Math.round(attachment.file_size / 1024)} KB</span>
                      )}
                    </div>
                  </button>
                  {isEditable && (
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
              {attachments.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">📎</div>
                  <p>Inga bilagor uppladdade</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      {isEditable && (
        <div className="fixed bottom-6 right-6 z-20">
          <div className="relative">
            {showQuickAdd && (
              <div className="absolute bottom-16 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-2 w-48 animate-in fade-in slide-in-from-bottom-2">
                <button
                  onClick={() => { setActiveTab('attendees'); setShowAddAttendee(true); setShowQuickAdd(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-slate-800 rounded-lg text-sm"
                >
                  <span>👥</span> Deltagare
                </button>
                <button
                  onClick={() => { setActiveTab('agenda'); setShowAddAgenda(true); setShowQuickAdd(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-slate-800 rounded-lg text-sm"
                >
                  <span>📝</span> Dagordning
                </button>
                <button
                  onClick={() => { setActiveTab('decisions'); setShowAddDecision(true); setShowQuickAdd(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-slate-800 rounded-lg text-sm"
                >
                  <span>⚖️</span> Beslut
                </button>
                <button
                  onClick={() => { setActiveTab('actions'); setShowAddAction(true); setShowQuickAdd(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-slate-800 rounded-lg text-sm"
                >
                  <span>✅</span> Åtgärd
                </button>
              </div>
            )}
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className={`w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-all flex items-center justify-center text-2xl ${showQuickAdd ? 'rotate-45' : ''}`}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {showSaveAsTemplate && protocol && (
        <SaveAsTemplateModal
          protocol={protocol}
          onClose={() => setShowSaveAsTemplate(false)}
          onSave={async (name, description) => {
            setIsSavingTemplate(true)
            try {
              await saveProtocolAsTemplate(protocol.id, name, description)
              setShowSaveAsTemplate(false)
              alert('Mall sparad!')
            } catch (error) {
              console.error('Failed to save template:', error)
              alert('Kunde inte spara mallen. Försök igen.')
            } finally {
              setIsSavingTemplate(false)
            }
          }}
          isSaving={isSavingTemplate}
        />
      )}
    </div>
  )
}

// Save as Template Modal
function SaveAsTemplateModal({ protocol, onClose, onSave, isSaving }: {
  protocol: ProtocolWithDetails
  onClose: () => void
  onSave: (name: string, description?: string) => Promise<void>
  isSaving: boolean
}) {
  const [name, setName] = useState(`${protocol.title} - Mall`)
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSave(name.trim(), description.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Spara som mall</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Preview of what will be saved */}
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Mallen kommer att inkludera:</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <span>📅</span>
                <span>Mötestyp: {meetingTypeConfig[protocol.meeting_type].label}</span>
              </div>
              {protocol.location && (
                <div className="flex items-center gap-2 text-slate-400">
                  <span>📍</span>
                  <span>Plats: {protocol.location}</span>
                </div>
              )}
              {protocol.start_time && (
                <div className="flex items-center gap-2 text-slate-400">
                  <span>🕐</span>
                  <span>Tid: {formatTime(protocol.start_time)}{protocol.end_time ? ` - ${formatTime(protocol.end_time)}` : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-400">
                <span>📝</span>
                <span>{protocol.agenda_items?.length || 0} dagordningspunkter</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span>👥</span>
                <span>{protocol.attendees?.length || 0} deltagarroller</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Mallens namn <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="t.ex. Byggmöte - Våra projekt"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Beskrivning (valfritt)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Beskriv när denna mall bör användas..."
            />
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
              disabled={!name.trim() || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sparar...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Spara mall
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Sub-components for forms
function AddAttendeeForm({ members, onSubmit, onCancel }: {
  members: ProjectMemberWithDetails[]
  onSubmit: (data: { user_id?: string; name: string; email?: string; company?: string; role: ProtocolAttendeeRole }) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'member' | 'external'>('member')
  const [selectedMember, setSelectedMember] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState<ProtocolAttendeeRole>('attendee')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'member' && selectedMember) {
      const member = members.find(m => m.user_id === selectedMember)
      if (member) {
        onSubmit({
          user_id: member.user_id,
          name: member.profile.full_name || member.profile.email || 'Okänd',
          email: member.profile.email || undefined,
          role,
        })
      }
    } else if (mode === 'external' && name) {
      onSubmit({
        name,
        email: email || undefined,
        company: company || undefined,
        role,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-4 space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="radio"
            checked={mode === 'member'}
            onChange={() => setMode('member')}
            className="text-blue-500"
          />
          Projektmedlem
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="radio"
            checked={mode === 'external'}
            onChange={() => setMode('external')}
            className="text-blue-500"
          />
          Extern deltagare
        </label>
      </div>

      {mode === 'member' ? (
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        >
          <option value="">Välj medlem...</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.profile.full_name || member.profile.email}
            </option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Namn *"
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-post"
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
          />
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Företag"
            className="col-span-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
          />
        </div>
      )}

      <select
        value={role}
        onChange={(e) => setRole(e.target.value as ProtocolAttendeeRole)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
      >
        {Object.entries(attendeeRoleConfig).map(([key, { label, icon }]) => (
          <option key={key} value={key}>{icon} {label}</option>
        ))}
      </select>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={(mode === 'member' && !selectedMember) || (mode === 'external' && !name)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
        >
          Lägg till
        </button>
      </div>
    </form>
  )
}

function AddAgendaForm({ onSubmit, onCancel }: {
  onSubmit: (data: { title: string; description?: string; duration_minutes?: number }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSubmit({
        title,
        description: description || undefined,
        duration_minutes: duration ? parseInt(duration) : undefined,
      })
    }} className="bg-slate-800 rounded-lg p-4 space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Rubrik *"
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beskrivning (valfritt)"
        rows={2}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
      />
      <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Tid i minuter (valfritt)"
        min="1"
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={!title}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
        >
          Lägg till
        </button>
      </div>
    </form>
  )
}

function AddDecisionForm({ onSubmit, onCancel }: {
  onSubmit: (description: string) => void
  onCancel: () => void
}) {
  const [description, setDescription] = useState('')

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSubmit(description)
    }} className="bg-slate-800 rounded-lg p-4 space-y-4">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beskriv beslutet *"
        rows={3}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
        required
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={!description}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
        >
          Lägg till
        </button>
      </div>
    </form>
  )
}

function AddActionForm({ members, onSubmit, onCancel }: {
  members: ProjectMemberWithDetails[]
  onSubmit: (data: { description: string; assigned_to?: string; assigned_to_name?: string; deadline?: string; priority: ProtocolActionItemPriority }) => void
  onCancel: () => void
}) {
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<ProtocolActionItemPriority>('medium')

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      const member = members.find(m => m.user_id === assignedTo)
      onSubmit({
        description,
        assigned_to: assignedTo || undefined,
        assigned_to_name: member?.profile.full_name || undefined,
        deadline: deadline || undefined,
        priority,
      })
    }} className="bg-slate-800 rounded-lg p-4 space-y-4">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beskriv åtgärden *"
        rows={3}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        >
          <option value="">Välj ansvarig...</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.profile.full_name || member.profile.email}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
      </div>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as ProtocolActionItemPriority)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
      >
        {Object.entries(actionPriorityConfig).map(([key, { label }]) => (
          <option key={key} value={key}>{label} prioritet</option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={!description}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
        >
          Lägg till
        </button>
      </div>
    </form>
  )
}

function AddLinkForm({ issues, deviations, onSubmit, onCancel }: {
  issues: IssueWithDetails[]
  deviations: DeviationWithDetails[]
  onSubmit: (data: { link_type: ProtocolLinkType; linked_item_id: string }) => void
  onCancel: () => void
}) {
  const [linkType, setLinkType] = useState<ProtocolLinkType>('issue')
  const [linkedItemId, setLinkedItemId] = useState('')

  const items = linkType === 'issue' ? issues : linkType === 'deviation' ? deviations : []

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSubmit({ link_type: linkType, linked_item_id: linkedItemId })
    }} className="bg-slate-800 rounded-lg p-4 space-y-4">
      <select
        value={linkType}
        onChange={(e) => {
          setLinkType(e.target.value as ProtocolLinkType)
          setLinkedItemId('')
        }}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
      >
        <option value="issue">{linkTypeConfig.issue.icon} Ärende</option>
        <option value="deviation">{linkTypeConfig.deviation.icon} Avvikelse</option>
      </select>
      <select
        value={linkedItemId}
        onChange={(e) => setLinkedItemId(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
      >
        <option value="">Välj {linkTypeConfig[linkType].label.toLowerCase()}...</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={!linkedItemId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
        >
          Lägg till
        </button>
      </div>
    </form>
  )
}
