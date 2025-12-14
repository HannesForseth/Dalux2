'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getProjectProtocols,
  createProtocol,
  deleteProtocol,
  getProjectProtocolStats
} from '@/app/actions/protocols'
import { getProjectMembers } from '@/app/actions/members'
import { getProtocolTemplates, applyTemplate } from '@/app/actions/protocol-templates'
import type {
  ProtocolWithCreator,
  ProtocolStatus,
  ProtocolMeetingType,
  CreateProtocolData,
  ProjectMemberWithDetails,
  ProtocolTemplate,
  ProtocolAttendeeRole
} from '@/types/database'

const ITEMS_PER_PAGE = 10

const statusConfig: Record<ProtocolStatus, { label: string; color: string; bg: string; icon: string }> = {
  draft: { label: 'Utkast', color: 'text-amber-600', bg: 'bg-amber-100', icon: '📝' },
  finalized: { label: 'Slutfört', color: 'text-green-600', bg: 'bg-green-100', icon: '✅' },
  archived: { label: 'Arkiverat', color: 'text-slate-600', bg: 'bg-slate-100', icon: '📦' },
}

const meetingTypeConfig: Record<ProtocolMeetingType, { label: string; color: string; bg: string; icon: string; description: string }> = {
  byggmote: { label: 'Byggmöte', color: 'text-blue-600', bg: 'bg-blue-50', icon: '🏗️', description: 'Regelbundet samordningsmöte på byggplats' },
  projektmote: { label: 'Projektmöte', color: 'text-purple-600', bg: 'bg-purple-50', icon: '📊', description: 'Övergripande projektgenomgång' },
  samordningsmote: { label: 'Samordningsmöte', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: '🤝', description: 'Samordning mellan entreprenörer' },
  startmote: { label: 'Startmöte', color: 'text-green-600', bg: 'bg-green-50', icon: '🚀', description: 'Kickoff och projektstart' },
  slutmote: { label: 'Slutmöte', color: 'text-orange-600', bg: 'bg-orange-50', icon: '🏁', description: 'Avslutning och överlämnande' },
  besiktning: { label: 'Besiktning', color: 'text-red-600', bg: 'bg-red-50', icon: '🔍', description: 'Besiktning och kvalitetskontroll' },
  other: { label: 'Övrigt', color: 'text-slate-600', bg: 'bg-slate-50', icon: '📋', description: 'Annat typ av möte' },
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Idag'
  if (days === 1) return 'Igår'
  if (days < 7) return `${days} dagar sedan`
  if (days < 30) return `${Math.floor(days / 7)} veckor sedan`
  return formatDate(dateString)
}

// Quick templates for new protocols
const quickTemplates: { type: ProtocolMeetingType; defaultAgenda: string[] }[] = [
  {
    type: 'byggmote',
    defaultAgenda: ['Föregående protokoll', 'Tidplan', 'Ekonomi', 'Kvalitet & säkerhet', 'Samordning', 'Övriga frågor']
  },
  {
    type: 'projektmote',
    defaultAgenda: ['Statusuppdatering', 'Risker & hinder', 'Beslut som behövs', 'Nästa steg']
  },
  {
    type: 'besiktning',
    defaultAgenda: ['Genomgång av utrymmen', 'Noterade avvikelser', 'Åtgärdslista', 'Slutsats']
  },
]

interface CreateProtocolModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: CreateProtocolData) => Promise<void>
  members: ProjectMemberWithDetails[]
  existingProtocols: ProtocolWithCreator[]
  templates: ProtocolTemplate[]
  preselectedType?: ProtocolMeetingType
}

function CreateProtocolModal({ isOpen, onClose, onCreate, members, existingProtocols, templates, preselectedType }: CreateProtocolModalProps) {
  const [step, setStep] = useState<'template' | 'type' | 'details'>(preselectedType ? 'details' : 'template')
  const [title, setTitle] = useState('')
  const [meetingType, setMeetingType] = useState<ProtocolMeetingType>(preselectedType || 'byggmote')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [previousProtocolId, setPreviousProtocolId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProtocolTemplate | null>(null)

  // Group templates by system/user
  const systemTemplates = templates.filter(t => t.is_system)
  const userTemplates = templates.filter(t => !t.is_system)

  useEffect(() => {
    if (preselectedType) {
      setMeetingType(preselectedType)
      setStep('details')
    }
  }, [preselectedType])

  // Handle template selection
  const handleSelectTemplate = async (template: ProtocolTemplate) => {
    setIsLoadingTemplate(true)
    try {
      const templateData = await applyTemplate(template.id)
      setSelectedTemplate(template)
      setMeetingType(templateData.meeting_type)
      if (templateData.location) setLocation(templateData.location)
      if (templateData.start_time) setStartTime(templateData.start_time)
      if (templateData.end_time) setEndTime(templateData.end_time)
      // Auto-generate title based on meeting type
      const typeLabel = meetingTypeConfig[templateData.meeting_type].label
      const existingOfType = existingProtocols.filter(p => p.meeting_type === templateData.meeting_type).length
      setTitle(`${typeLabel} #${existingOfType + 1}`)
      setStep('details')
    } catch (error) {
      console.error('Failed to apply template:', error)
    } finally {
      setIsLoadingTemplate(false)
    }
  }

  const handleSkipTemplate = () => {
    setSelectedTemplate(null)
    setStep('type')
  }

  useEffect(() => {
    // Auto-generate title based on type
    if (!title || title.startsWith('Byggmöte') || title.startsWith('Projektmöte') || title.startsWith('Besiktning')) {
      const typeLabel = meetingTypeConfig[meetingType].label
      const existingOfType = existingProtocols.filter(p => p.meeting_type === meetingType).length
      setTitle(`${typeLabel} #${existingOfType + 1}`)
    }
  }, [meetingType, existingProtocols, title])

  if (!isOpen) return null

  const handleSelectType = (type: ProtocolMeetingType) => {
    setMeetingType(type)
    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !meetingDate) return

    setIsSubmitting(true)
    try {
      await onCreate({
        title: title.trim(),
        meeting_type: meetingType,
        meeting_date: meetingDate,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        location: location.trim() || undefined,
        previous_protocol_id: previousProtocolId || undefined,
      })
      // Reset form
      setTitle('')
      setMeetingType('byggmote')
      setMeetingDate(new Date().toISOString().split('T')[0])
      setStartTime('')
      setEndTime('')
      setLocation('')
      setPreviousProtocolId('')
      setSelectedTemplate(null)
      setStep('template')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep('template')
    setSelectedTemplate(null)
    onClose()
  }

  const handleBack = () => {
    if (step === 'details') {
      if (selectedTemplate) {
        // Going back from details with a template selected, go to template selection
        setSelectedTemplate(null)
        setStep('template')
      } else {
        // Going back from details to type selection
        setStep('type')
      }
    } else if (step === 'type') {
      setStep('template')
    }
  }

  return (
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
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            {((step === 'type') || (step === 'details' && !preselectedType)) && (
              <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-semibold text-slate-900">
              {step === 'template' ? 'Välj mall' : step === 'type' ? 'Välj mötestyp' : 'Skapa protokoll'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XIcon />
          </button>
        </div>

        {step === 'template' ? (
          <div className="p-6">
            {isLoadingTemplate ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : (
              <>
                <p className="text-slate-600 mb-6">Använd en mall för att snabbt komma igång med fördefinierade inställningar:</p>

                {/* System Templates */}
                {systemTemplates.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      </svg>
                      Färdiga mallar
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {systemTemplates.map((template) => {
                        const typeConfig = meetingTypeConfig[template.meeting_type as ProtocolMeetingType]
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={`p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left group ${typeConfig?.bg || 'bg-slate-50'}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{typeConfig?.icon || '📋'}</span>
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-medium ${typeConfig?.color || 'text-slate-900'}`}>{template.name}</h4>
                                {template.description && (
                                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">{template.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                  {template.default_start_time && (
                                    <span className="flex items-center gap-1">
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                      </svg>
                                      {formatTime(template.default_start_time)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* User Templates */}
                {userTemplates.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      Mina mallar
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {userTemplates.map((template) => {
                        const typeConfig = meetingTypeConfig[template.meeting_type as ProtocolMeetingType]
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={`p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all text-left group ${typeConfig?.bg || 'bg-slate-50'}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{typeConfig?.icon || '📋'}</span>
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-medium ${typeConfig?.color || 'text-slate-900'}`}>{template.name}</h4>
                                {template.description && (
                                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">{template.description}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Skip button */}
                <div className="border-t border-slate-200 pt-4">
                  <button
                    onClick={handleSkipTemplate}
                    className="w-full p-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-center group"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">✨</span>
                      <div>
                        <h4 className="font-medium text-slate-700 group-hover:text-indigo-600">Börja från scratch</h4>
                        <p className="text-slate-500 text-sm">Skapa ett tomt protokoll utan mall</p>
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : step === 'type' ? (
          <div className="p-6">
            <p className="text-slate-600 mb-6">Välj vilken typ av möte du vill protokollföra:</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(meetingTypeConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleSelectType(key as ProtocolMeetingType)}
                  className={`p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left group ${config.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <h3 className={`font-medium ${config.color}`}>{config.label}</h3>
                      <p className="text-slate-500 text-sm mt-1">{config.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Selected type badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${meetingTypeConfig[meetingType].bg} border border-slate-200`}>
              <span>{meetingTypeConfig[meetingType].icon}</span>
              <span className={meetingTypeConfig[meetingType].color}>{meetingTypeConfig[meetingType].label}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="t.ex. Byggmöte #12"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Starttid
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sluttid
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plats
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="t.ex. Byggplatskontoret, Teams, etc."
              />
            </div>

            {existingProtocols.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Föregående protokoll (valfritt)
                </label>
                <select
                  value={previousProtocolId}
                  onChange={(e) => setPreviousProtocolId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Inget valt</option>
                  {existingProtocols.map((protocol) => (
                    <option key={protocol.id} value={protocol.id}>
                      #{protocol.protocol_number} - {protocol.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !meetingDate || isSubmitting}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Skapar...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    Skapa protokoll
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
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

function ClipboardDocumentListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  )
}

export default function ProjectProtocolsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [protocols, setProtocols] = useState<ProtocolWithCreator[]>([])
  const [members, setMembers] = useState<ProjectMemberWithDetails[]>([])
  const [templates, setTemplates] = useState<ProtocolTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [preselectedType, setPreselectedType] = useState<ProtocolMeetingType | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<ProtocolStatus | 'all'>('all')
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<ProtocolMeetingType | 'all'>('all')
  const [stats, setStats] = useState({ total: 0, draft: 0, finalized: 0, pendingActions: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')

  // Filter protocols by search query (client-side)
  const filteredProtocols = useMemo(() => {
    let result = protocols

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter)
    }

    if (meetingTypeFilter !== 'all') {
      result = result.filter(p => p.meeting_type === meetingTypeFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(protocol =>
        protocol.title.toLowerCase().includes(query) ||
        protocol.protocol_number.toString().includes(query) ||
        protocol.location?.toLowerCase().includes(query) ||
        protocol.creator?.full_name?.toLowerCase().includes(query)
      )
    }

    return result
  }, [protocols, statusFilter, meetingTypeFilter, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredProtocols.length / ITEMS_PER_PAGE)
  const paginatedProtocols = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProtocols.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProtocols, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, meetingTypeFilter, searchQuery])

  // PDF Export function
  const exportToPDF = useCallback(() => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.text('Protokolllista', 14, 22)
    doc.setFontSize(10)
    doc.text(`Exporterad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 30)
    doc.text(`Totalt: ${filteredProtocols.length} protokoll`, 14, 36)

    // Table data
    const tableData = filteredProtocols.map(protocol => [
      `#${protocol.protocol_number}`,
      protocol.title,
      meetingTypeConfig[protocol.meeting_type].label,
      formatDate(protocol.meeting_date),
      protocol.location || '-',
      statusConfig[protocol.status].label,
      protocol.creator?.full_name || '-'
    ])

    autoTable(doc, {
      head: [['Nr', 'Titel', 'Typ', 'Datum', 'Plats', 'Status', 'Skapad av']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    })

    doc.save(`protokoll-${new Date().toISOString().split('T')[0]}.pdf`)
  }, [filteredProtocols])

  const loadData = useCallback(async () => {
    try {
      const [protocolData, statsData, membersData, templatesData] = await Promise.all([
        getProjectProtocols(projectId),
        getProjectProtocolStats(projectId),
        getProjectMembers(projectId),
        getProtocolTemplates()
      ])
      setProtocols(protocolData)
      setStats(statsData)
      setMembers(membersData)
      setTemplates(templatesData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async (data: CreateProtocolData) => {
    const newProtocol = await createProtocol(projectId, data)
    await loadData()
    // Navigate to the new protocol
    router.push(`/dashboard/projects/${projectId}/protocols/${newProtocol.id}`)
  }

  const handleQuickCreate = (type: ProtocolMeetingType) => {
    setPreselectedType(type)
    setShowCreateModal(true)
  }

  const handleDelete = async (protocolId: string) => {
    if (!confirm('Är du säker på att du vill ta bort detta protokoll?')) return

    try {
      await deleteProtocol(protocolId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete protocol:', error)
    }
  }

  if (isLoading) {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Protokoll</h1>
        </div>
        <button
          onClick={() => {
            setPreselectedType(undefined)
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/25 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nytt protokoll
        </button>
      </div>

      {/* Quick Start Templates - Only show when no protocols exist */}
      {protocols.length === 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Snabbstart</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickTemplates.map((template, index) => {
              const config = meetingTypeConfig[template.type]
              return (
                <motion.button
                  key={template.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleQuickCreate(template.type)}
                  className={`p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all text-left ${config.bg}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{config.icon}</span>
                    <h3 className={`font-medium ${config.color}`}>{config.label}</h3>
                  </div>
                  <p className="text-slate-500 text-sm">{config.description}</p>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { key: 'all' as const, label: 'Totalt', value: stats.total, icon: '📋', color: 'text-slate-600', hoverColor: 'hover:border-slate-300' },
          { key: 'draft' as const, label: 'Utkast', value: stats.draft, icon: '📝', color: 'text-amber-600', hoverColor: 'hover:border-amber-300' },
          { key: 'finalized' as const, label: 'Slutförda', value: stats.finalized, icon: '✅', color: 'text-green-600', hoverColor: 'hover:border-green-300' },
          { key: 'actions' as const, label: 'Pågående åtgärder', value: stats.pendingActions, icon: '⏳', color: 'text-orange-600', hoverColor: '' },
        ].map((stat, index) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => stat.key !== 'actions' && setStatusFilter(stat.key === 'all' ? 'all' : stat.key)}
            className={`bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 ${stat.hoverColor} transition-all ${stat.key !== 'actions' ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center justify-between">
              <p className={`${stat.color} text-sm font-medium`}>{stat.label}</p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search, Filters & View Toggle */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Sök protokoll..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProtocolStatus | 'all')}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">Alla statusar</option>
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={meetingTypeFilter}
          onChange={(e) => setMeetingTypeFilter(e.target.value as ProtocolMeetingType | 'all')}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">Alla mötestyper</option>
          {Object.entries(meetingTypeConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="flex bg-white border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>
        </div>

        {/* Export PDF Button */}
        <button
          onClick={exportToPDF}
          disabled={filteredProtocols.length === 0}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          Exportera PDF
        </button>
      </div>

      {/* Search results info */}
      {(searchQuery || statusFilter !== 'all' || meetingTypeFilter !== 'all') && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-500">
            Visar {filteredProtocols.length} av {protocols.length} protokoll
          </span>
          <button
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
              setMeetingTypeFilter('all')
            }}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            Rensa filter
          </button>
        </div>
      )}

      {filteredProtocols.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-12 text-center"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardDocumentListIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery || statusFilter !== 'all' || meetingTypeFilter !== 'all'
              ? 'Inga protokoll matchar sökningen'
              : 'Inga protokoll än'}
          </h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || meetingTypeFilter !== 'all'
              ? 'Prova att ändra sök eller filter för att se fler protokoll.'
              : 'Skapa protokoll för att dokumentera möten, beslut och åtgärdspunkter i projektet.'}
          </p>
          {!searchQuery && statusFilter === 'all' && meetingTypeFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/25"
            >
              Skapa protokoll
            </button>
          )}
        </motion.div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedProtocols.map((protocol, index) => {
            const typeConfig = meetingTypeConfig[protocol.meeting_type]
            const status = statusConfig[protocol.status]

            return (
              <motion.div
                key={protocol.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/dashboard/projects/${projectId}/protocols/${protocol.id}`}
                  className={`block bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-lg transition-all group`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Type & Status badges */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{typeConfig.icon}</span>
                        <span className={`text-sm font-medium ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-indigo-600 font-mono text-sm">
                          #{protocol.protocol_number}
                        </span>
                        <h3 className="text-slate-900 font-medium truncate group-hover:text-indigo-600 transition-colors">
                          {protocol.title}
                        </h3>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                          </svg>
                          {formatDate(protocol.meeting_date)}
                        </span>

                        {protocol.start_time && (
                          <span className="flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            {formatTime(protocol.start_time)}
                          </span>
                        )}

                        {protocol.location && (
                          <span className="flex items-center gap-1 truncate">
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            {protocol.location}
                          </span>
                        )}
                      </div>

                      {/* Creator & Update info */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                        {protocol.creator && (
                          <span className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                              {protocol.creator.full_name?.charAt(0) || '?'}
                            </div>
                            {protocol.creator.full_name}
                          </span>
                        )}
                        <span>{formatRelativeTime(protocol.updated_at || protocol.created_at)}</span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleDelete(protocol.id)
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Ta bort"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {paginatedProtocols.map((protocol, index) => {
            const typeConfig = meetingTypeConfig[protocol.meeting_type]
            const status = statusConfig[protocol.status]

            return (
              <motion.div
                key={protocol.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  href={`/dashboard/projects/${projectId}/protocols/${protocol.id}`}
                  className="flex items-center gap-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <span className="text-xl">{typeConfig.icon}</span>
                  <span className="text-indigo-600 font-mono text-sm w-12">#{protocol.protocol_number}</span>
                  <span className="text-slate-900 font-medium flex-1 truncate group-hover:text-indigo-600 transition-colors">{protocol.title}</span>
                  <span className={`text-sm ${typeConfig.color} hidden sm:block`}>{typeConfig.label}</span>
                  <span className="text-slate-500 text-sm hidden md:block">{formatDate(protocol.meeting_date)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.color}`}>{status.label}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(protocol.id)
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6">
          <p className="text-sm text-slate-500">
            Visar {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProtocols.length)} av {filteredProtocols.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateProtocolModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false)
              setPreselectedType(undefined)
            }}
            onCreate={handleCreate}
            members={members}
            existingProtocols={protocols}
            templates={templates}
            preselectedType={preselectedType}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
