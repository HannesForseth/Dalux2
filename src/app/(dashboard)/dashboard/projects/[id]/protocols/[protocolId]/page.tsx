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
  getProtocolAttachmentUrl
} from '@/app/actions/protocols'
import { getProjectMembers } from '@/app/actions/members'
import { getProjectIssues } from '@/app/actions/issues'
import { getProjectDeviations } from '@/app/actions/deviations'
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

const statusConfig: Record<ProtocolStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Utkast', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  finalized: { label: 'Slutfört', color: 'text-green-400', bg: 'bg-green-400/10' },
  archived: { label: 'Arkiverat', color: 'text-slate-400', bg: 'bg-slate-400/10' },
}

const meetingTypeConfig: Record<ProtocolMeetingType, { label: string; color: string }> = {
  byggmote: { label: 'Byggmöte', color: 'text-blue-400' },
  projektmote: { label: 'Projektmöte', color: 'text-purple-400' },
  samordningsmote: { label: 'Samordningsmöte', color: 'text-cyan-400' },
  startmote: { label: 'Startmöte', color: 'text-green-400' },
  slutmote: { label: 'Slutmöte', color: 'text-orange-400' },
  besiktning: { label: 'Besiktning', color: 'text-red-400' },
  other: { label: 'Övrigt', color: 'text-slate-400' },
}

const attendeeRoleConfig: Record<ProtocolAttendeeRole, string> = {
  organizer: 'Organisatör',
  recorder: 'Protokollförare',
  attendee: 'Deltagare',
  absent_notified: 'Frånvarande (anmält)',
}

const actionStatusConfig: Record<ProtocolActionItemStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Ej påbörjad', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  in_progress: { label: 'Pågående', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  completed: { label: 'Slutförd', color: 'text-green-400', bg: 'bg-green-400/10' },
  cancelled: { label: 'Avbruten', color: 'text-slate-400', bg: 'bg-slate-400/10' },
}

const actionPriorityConfig: Record<ProtocolActionItemPriority, { label: string; color: string }> = {
  low: { label: 'Låg', color: 'text-slate-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  high: { label: 'Hög', color: 'text-orange-400' },
  critical: { label: 'Kritisk', color: 'text-red-400' },
}

const linkTypeConfig: Record<ProtocolLinkType, string> = {
  issue: 'Ärende',
  deviation: 'Avvikelse',
  rfi: 'RFI',
  checklist: 'Checklista',
  document: 'Dokument',
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

function ChevronIcon({ className = "h-4 w-4", direction = "down" }: { className?: string; direction?: "up" | "down" }) {
  return (
    <svg className={`${className} transition-transform ${direction === "up" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
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

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    attendees: true,
    agenda: true,
    notes: true,
    decisions: true,
    actions: true,
    links: true,
    attachments: true,
  })

  // Form states
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [showAddAttendee, setShowAddAttendee] = useState(false)
  const [showAddAgenda, setShowAddAgenda] = useState(false)
  const [showAddDecision, setShowAddDecision] = useState(false)
  const [showAddAction, setShowAddAction] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

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
    } catch (error) {
      console.error('Failed to load protocol:', error)
    } finally {
      setIsLoading(false)
    }
  }, [protocolId, projectId, router])

  useEffect(() => {
    loadData()
  }, [loadData])

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
      await addAttendee(protocolId, data)
      await loadData()
      setShowAddAttendee(false)
    } catch (error) {
      console.error('Failed to add attendee:', error)
    }
  }

  // Toggle attendance
  const handleToggleAttendance = async (attendeeId: string, attended: boolean) => {
    try {
      await updateAttendee(attendeeId, { attended })
      await loadData()
    } catch (error) {
      console.error('Failed to update attendance:', error)
    }
  }

  // Remove attendee
  const handleRemoveAttendee = async (attendeeId: string) => {
    if (!confirm('Ta bort denna deltagare?')) return
    try {
      await removeAttendee(attendeeId)
      await loadData()
    } catch (error) {
      console.error('Failed to remove attendee:', error)
    }
  }

  // Add agenda item
  const handleAddAgendaItem = async (data: { title: string; description?: string; duration_minutes?: number }) => {
    try {
      const nextOrder = (protocol?.agenda_items?.length || 0) + 1
      await addAgendaItem(protocolId, { ...data, order_index: nextOrder })
      await loadData()
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
      await loadData()
    } catch (error) {
      console.error('Failed to delete agenda item:', error)
    }
  }

  // Add decision
  const handleAddDecision = async (description: string) => {
    try {
      await addDecision(protocolId, { description })
      await loadData()
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
      await loadData()
    } catch (error) {
      console.error('Failed to delete decision:', error)
    }
  }

  // Add action item
  const handleAddActionItem = async (data: { description: string; assigned_to?: string; assigned_to_name?: string; deadline?: string; priority: ProtocolActionItemPriority }) => {
    try {
      await addActionItem(protocolId, data)
      await loadData()
      setShowAddAction(false)
    } catch (error) {
      console.error('Failed to add action item:', error)
    }
  }

  // Update action item status
  const handleUpdateActionStatus = async (actionId: string, status: ProtocolActionItemStatus) => {
    try {
      await updateActionItem(actionId, { status })
      await loadData()
    } catch (error) {
      console.error('Failed to update action status:', error)
    }
  }

  // Delete action item
  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Ta bort denna åtgärd?')) return
    try {
      await deleteActionItem(actionId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete action:', error)
    }
  }

  // Add link
  const handleAddLink = async (data: { link_type: ProtocolLinkType; linked_item_id: string }) => {
    try {
      await addLink(protocolId, data)
      await loadData()
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
      await loadData()
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/dashboard/projects/${projectId}/protocols`}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <span className="text-blue-400 font-mono">#{protocol.protocol_number}</span>
            <h1 className="text-2xl font-bold text-white">{protocol.title}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className={`px-2 py-0.5 rounded-full ${statusConfig[protocol.status].bg} ${statusConfig[protocol.status].color}`}>
              {statusConfig[protocol.status].label}
            </span>
            <span className={meetingTypeConfig[protocol.meeting_type].color}>
              {meetingTypeConfig[protocol.meeting_type].label}
            </span>
            <span className="text-slate-400">{formatDate(protocol.meeting_date)}</span>
            {protocol.start_time && (
              <span className="text-slate-500">
                {formatTime(protocol.start_time)}
                {protocol.end_time && ` - ${formatTime(protocol.end_time)}`}
              </span>
            )}
            {protocol.location && (
              <span className="text-slate-500">{protocol.location}</span>
            )}
          </div>
        </div>

        {isEditable && (
          <button
            onClick={handleFinalize}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors"
          >
            Slutför protokoll
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Attendees Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('attendees')}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <h2 className="text-lg font-semibold text-white">Deltagare ({protocol.attendees?.length || 0})</h2>
            <ChevronIcon direction={expandedSections.attendees ? "up" : "down"} />
          </button>

          {expandedSections.attendees && (
            <div className="px-6 pb-4 space-y-3">
              {protocol.attendees?.map((attendee) => (
                <div key={attendee.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={attendee.attended}
                      onChange={(e) => isEditable && handleToggleAttendance(attendee.id, e.target.checked)}
                      disabled={!isEditable}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-white">{attendee.name}</span>
                      {attendee.company && (
                        <span className="text-slate-500 ml-2">({attendee.company})</span>
                      )}
                      <span className="text-slate-500 text-sm ml-2">{attendeeRoleConfig[attendee.role]}</span>
                    </div>
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => handleRemoveAttendee(attendee.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}

              {isEditable && (
                showAddAttendee ? (
                  <AddAttendeeForm
                    members={members}
                    onSubmit={handleAddAttendee}
                    onCancel={() => setShowAddAttendee(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddAttendee(true)}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <PlusIcon /> Lägg till deltagare
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* Agenda Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('agenda')}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <h2 className="text-lg font-semibold text-white">Dagordning ({protocol.agenda_items?.length || 0})</h2>
            <ChevronIcon direction={expandedSections.agenda ? "up" : "down"} />
          </button>

          {expandedSections.agenda && (
            <div className="px-6 pb-4 space-y-3">
              {protocol.agenda_items?.sort((a, b) => a.order_index - b.order_index).map((item, index) => (
                <div key={item.id} className="flex items-start justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-400 font-mono text-sm w-6">{index + 1}.</span>
                    <div>
                      <h4 className="text-white">{item.title}</h4>
                      {item.description && (
                        <p className="text-slate-400 text-sm mt-1">{item.description}</p>
                      )}
                      {item.duration_minutes && (
                        <span className="text-slate-500 text-xs">{item.duration_minutes} min</span>
                      )}
                    </div>
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => handleDeleteAgendaItem(item.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}

              {isEditable && (
                showAddAgenda ? (
                  <AddAgendaForm
                    onSubmit={handleAddAgendaItem}
                    onCancel={() => setShowAddAgenda(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddAgenda(true)}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <PlusIcon /> Lägg till punkt
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* Notes Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('notes')}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <h2 className="text-lg font-semibold text-white">Anteckningar</h2>
            <ChevronIcon direction={expandedSections.notes ? "up" : "down"} />
          </button>

          {expandedSections.notes && (
            <div className="px-6 pb-4 space-y-4">
              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="Skriv mötesanteckningar..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setNotesValue(protocol.notes || '')
                        setEditingNotes(false)
                      }}
                      className="px-3 py-1.5 text-slate-400 hover:text-white"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
                    >
                      {isSaving ? 'Sparar...' : 'Spara'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {protocol.notes ? (
                    <div className="prose prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-slate-300 font-sans text-sm bg-slate-800 p-4 rounded-lg">
                        {protocol.notes}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Inga anteckningar än.</p>
                  )}
                  {isEditable && (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Redigera anteckningar
                    </button>
                  )}
                </>
              )}

              {/* AI Summary */}
              {protocol.ai_summary && (
                <div className="mt-4 p-4 bg-slate-800 border border-blue-900 rounded-lg">
                  <h4 className="text-blue-400 text-sm font-medium mb-2">AI-sammanfattning</h4>
                  <p className="text-slate-300 text-sm">{protocol.ai_summary}</p>
                </div>
              )}

              {isEditable && protocol.notes && (
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  {isGeneratingSummary ? 'Genererar...' : 'Generera AI-sammanfattning'}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Decisions Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('decisions')}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <h2 className="text-lg font-semibold text-white">Beslut ({protocol.decisions?.length || 0})</h2>
            <ChevronIcon direction={expandedSections.decisions ? "up" : "down"} />
          </button>

          {expandedSections.decisions && (
            <div className="px-6 pb-4 space-y-3">
              {protocol.decisions?.map((decision) => (
                <div key={decision.id} className="flex items-start justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 font-mono text-sm">B{decision.decision_number}</span>
                    <div>
                      <p className="text-white">{decision.description}</p>
                      {decision.decided_by && (
                        <span className="text-slate-500 text-xs">Beslutat av: {decision.decided_by}</span>
                      )}
                    </div>
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => handleDeleteDecision(decision.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}

              {isEditable && (
                showAddDecision ? (
                  <AddDecisionForm
                    onSubmit={handleAddDecision}
                    onCancel={() => setShowAddDecision(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddDecision(true)}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <PlusIcon /> Lägg till beslut
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* Action Items Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('actions')}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <h2 className="text-lg font-semibold text-white">Åtgärdspunkter ({protocol.action_items?.length || 0})</h2>
            <ChevronIcon direction={expandedSections.actions ? "up" : "down"} />
          </button>

          {expandedSections.actions && (
            <div className="px-6 pb-4 space-y-3">
              {protocol.action_items?.map((action) => (
                <div key={action.id} className="flex items-start justify-between py-3 border-b border-slate-800 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-orange-400 font-mono text-sm">Å{action.action_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${actionStatusConfig[action.status].bg} ${actionStatusConfig[action.status].color}`}>
                        {actionStatusConfig[action.status].label}
                      </span>
                      <span className={`text-xs ${actionPriorityConfig[action.priority].color}`}>
                        {actionPriorityConfig[action.priority].label}
                      </span>
                    </div>
                    <p className="text-white mb-1">{action.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {action.assigned_to_name && (
                        <span>Ansvarig: {action.assigned_to_name}</span>
                      )}
                      {action.deadline && (
                        <span>Deadline: {formatDate(action.deadline)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={action.status}
                      onChange={(e) => handleUpdateActionStatus(action.id, e.target.value as ProtocolActionItemStatus)}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {Object.entries(actionStatusConfig).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {isEditable && (
                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isEditable && (
                showAddAction ? (
                  <AddActionForm
                    members={members}
                    onSubmit={handleAddActionItem}
                    onCancel={() => setShowAddAction(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddAction(true)}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <PlusIcon /> Lägg till åtgärd
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* Links Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('links')}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <h2 className="text-lg font-semibold text-white">Kopplingar ({protocol.links?.length || 0})</h2>
            <ChevronIcon direction={expandedSections.links ? "up" : "down"} />
          </button>

          {expandedSections.links && (
            <div className="px-6 pb-4 space-y-3">
              {protocol.links?.map((link) => (
                <div key={link.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">{linkTypeConfig[link.link_type]}</span>
                    <span className="text-white">{link.linked_item_id}</span>
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => handleRemoveLink(link.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}

              {isEditable && (
                showAddLink ? (
                  <AddLinkForm
                    issues={issues}
                    deviations={deviations}
                    onSubmit={handleAddLink}
                    onCancel={() => setShowAddLink(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddLink(true)}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <PlusIcon /> Lägg till koppling
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* Attachments Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('attachments')}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <h2 className="text-lg font-semibold text-white">Bilagor ({attachments.length})</h2>
            <ChevronIcon direction={expandedSections.attachments ? "up" : "down"} />
          </button>

          {expandedSections.attachments && (
            <div className="px-6 pb-4 space-y-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <button
                    onClick={() => handleViewAttachment(attachment.file_path)}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                    {attachment.file_name}
                  </button>
                  {isEditable && (
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}

              {isEditable && (
                <label className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadAttachment(file)
                    }}
                  />
                  <PlusIcon /> Lägg till bilaga
                </label>
              )}
            </div>
          )}
        </section>
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
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="radio"
            checked={mode === 'member'}
            onChange={() => setMode('member')}
            className="text-blue-500"
          />
          Projektmedlem
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
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
        {Object.entries(attendeeRoleConfig).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={(mode === 'member' && !selectedMember) || (mode === 'external' && !name)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
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
    }} className="bg-slate-800 rounded-lg p-4 space-y-3">
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
        placeholder="Beskrivning"
        rows={2}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
      />
      <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Beräknad tid (minuter)"
        min="1"
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={!title}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
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
    }} className="bg-slate-800 rounded-lg p-4 space-y-3">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beskriv beslutet *"
        rows={2}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
        required
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={!description}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
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
    }} className="bg-slate-800 rounded-lg p-4 space-y-3">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beskriv åtgärden *"
        rows={2}
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
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={!description}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
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
    }} className="bg-slate-800 rounded-lg p-4 space-y-3">
      <select
        value={linkType}
        onChange={(e) => {
          setLinkType(e.target.value as ProtocolLinkType)
          setLinkedItemId('')
        }}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
      >
        <option value="issue">Ärende</option>
        <option value="deviation">Avvikelse</option>
      </select>
      <select
        value={linkedItemId}
        onChange={(e) => setLinkedItemId(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
      >
        <option value="">Välj {linkTypeConfig[linkType].toLowerCase()}...</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-slate-400 hover:text-white">
          Avbryt
        </button>
        <button
          type="submit"
          disabled={!linkedItemId}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
        >
          Lägg till
        </button>
      </div>
    </form>
  )
}
