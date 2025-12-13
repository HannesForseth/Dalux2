'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getProjectProtocols,
  createProtocol,
  deleteProtocol,
  getProjectProtocolStats
} from '@/app/actions/protocols'
import { getProjectMembers } from '@/app/actions/members'
import type {
  ProtocolWithCreator,
  ProtocolStatus,
  ProtocolMeetingType,
  CreateProtocolData,
  ProjectMemberWithDetails
} from '@/types/database'

const ITEMS_PER_PAGE = 10

const statusConfig: Record<ProtocolStatus, { label: string; color: string; bg: string; icon: string }> = {
  draft: { label: 'Utkast', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: '📝' },
  finalized: { label: 'Slutfört', color: 'text-green-400', bg: 'bg-green-400/10', icon: '✅' },
  archived: { label: 'Arkiverat', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: '📦' },
}

const meetingTypeConfig: Record<ProtocolMeetingType, { label: string; color: string; bg: string; icon: string; description: string }> = {
  byggmote: { label: 'Byggmöte', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '🏗️', description: 'Regelbundet samordningsmöte på byggplats' },
  projektmote: { label: 'Projektmöte', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: '📊', description: 'Övergripande projektgenomgång' },
  samordningsmote: { label: 'Samordningsmöte', color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: '🤝', description: 'Samordning mellan entreprenörer' },
  startmote: { label: 'Startmöte', color: 'text-green-400', bg: 'bg-green-500/10', icon: '🚀', description: 'Kickoff och projektstart' },
  slutmote: { label: 'Slutmöte', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '🏁', description: 'Avslutning och överlämnande' },
  besiktning: { label: 'Besiktning', color: 'text-red-400', bg: 'bg-red-500/10', icon: '🔍', description: 'Besiktning och kvalitetskontroll' },
  other: { label: 'Övrigt', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: '📋', description: 'Annat typ av möte' },
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
  preselectedType?: ProtocolMeetingType
}

function CreateProtocolModal({ isOpen, onClose, onCreate, members, existingProtocols, preselectedType }: CreateProtocolModalProps) {
  const [step, setStep] = useState<'type' | 'details'>(preselectedType ? 'details' : 'type')
  const [title, setTitle] = useState('')
  const [meetingType, setMeetingType] = useState<ProtocolMeetingType>(preselectedType || 'byggmote')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [previousProtocolId, setPreviousProtocolId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (preselectedType) {
      setMeetingType(preselectedType)
      setStep('details')
    }
  }, [preselectedType])

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
      setStep('type')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep('type')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <div className="flex items-center gap-3">
            {step === 'details' && !preselectedType && (
              <button onClick={() => setStep('type')} className="text-slate-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-semibold text-white">
              {step === 'type' ? 'Välj mötestyp' : 'Skapa protokoll'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon />
          </button>
        </div>

        {step === 'type' ? (
          <div className="p-6">
            <p className="text-slate-400 mb-6">Välj vilken typ av möte du vill protokollföra:</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(meetingTypeConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleSelectType(key as ProtocolMeetingType)}
                  className={`p-4 rounded-xl border border-slate-700 hover:border-slate-500 transition-all text-left group ${config.bg}`}
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
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${meetingTypeConfig[meetingType].bg}`}>
              <span>{meetingTypeConfig[meetingType].icon}</span>
              <span className={meetingTypeConfig[meetingType].color}>{meetingTypeConfig[meetingType].label}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="t.ex. Byggmöte #12"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Starttid
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Sluttid
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Plats
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="t.ex. Byggplatskontoret, Teams, etc."
              />
            </div>

            {existingProtocols.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Föregående protokoll (valfritt)
                </label>
                <select
                  value={previousProtocolId}
                  onChange={(e) => setPreviousProtocolId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
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
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !meetingDate || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
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

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function LoadingSpinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
      headStyles: { fillColor: [59, 130, 246] },
    })

    doc.save(`protokoll-${new Date().toISOString().split('T')[0]}.pdf`)
  }, [filteredProtocols])

  const loadData = useCallback(async () => {
    try {
      const [protocolData, statsData, membersData] = await Promise.all([
        getProjectProtocols(projectId),
        getProjectProtocolStats(projectId),
        getProjectMembers(projectId)
      ])
      setProtocols(protocolData)
      setStats(statsData)
      setMembers(membersData)
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
        <LoadingSpinner className="h-8 w-8 text-blue-500" />
      </div>
    )
  }

  return (
    <div>
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
          <h1 className="text-2xl font-bold text-white">Protokoll</h1>
        </div>
        <button
          onClick={() => {
            setPreselectedType(undefined)
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nytt protokoll
        </button>
      </div>

      {/* Quick Start Templates - Only show when no protocols exist */}
      {protocols.length === 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-white mb-4">Snabbstart</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickTemplates.map((template) => {
              const config = meetingTypeConfig[template.type]
              return (
                <button
                  key={template.type}
                  onClick={() => handleQuickCreate(template.type)}
                  className={`p-4 rounded-xl border border-slate-700 hover:border-slate-500 transition-all text-left ${config.bg}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{config.icon}</span>
                    <h3 className={`font-medium ${config.color}`}>{config.label}</h3>
                  </div>
                  <p className="text-slate-500 text-sm">{config.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors cursor-pointer"
             onClick={() => setStatusFilter('all')}>
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">Totalt</p>
            <span className="text-xl">📋</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-yellow-900 transition-colors cursor-pointer"
             onClick={() => setStatusFilter('draft')}>
          <div className="flex items-center justify-between">
            <p className="text-yellow-400 text-sm">Utkast</p>
            <span className="text-xl">📝</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">{stats.draft}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-green-900 transition-colors cursor-pointer"
             onClick={() => setStatusFilter('finalized')}>
          <div className="flex items-center justify-between">
            <p className="text-green-400 text-sm">Slutförda</p>
            <span className="text-xl">✅</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">{stats.finalized}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-orange-400 text-sm">Pågående åtgärder</p>
            <span className="text-xl">⏳</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">{stats.pendingActions}</p>
        </div>
      </div>

      {/* Search, Filters & View Toggle */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Sök protokoll..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <XIcon />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProtocolStatus | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Alla statusar</option>
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={meetingTypeFilter}
          onChange={(e) => setMeetingTypeFilter(e.target.value as ProtocolMeetingType | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Alla mötestyper</option>
          {Object.entries(meetingTypeConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded ${viewMode === 'cards' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
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
          className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          <span className="text-sm text-slate-400">
            Visar {filteredProtocols.length} av {protocols.length} protokoll
          </span>
          <button
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
              setMeetingTypeFilter('all')
            }}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Rensa filter
          </button>
        </div>
      )}

      {filteredProtocols.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardDocumentListIcon className="h-8 w-8 text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {searchQuery || statusFilter !== 'all' || meetingTypeFilter !== 'all'
              ? 'Inga protokoll matchar sökningen'
              : 'Inga protokoll än'}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || meetingTypeFilter !== 'all'
              ? 'Prova att ändra sök eller filter för att se fler protokoll.'
              : 'Skapa protokoll för att dokumentera möten, beslut och åtgärdspunkter i projektet.'}
          </p>
          {!searchQuery && statusFilter === 'all' && meetingTypeFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
            >
              Skapa protokoll
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedProtocols.map((protocol) => {
            const typeConfig = meetingTypeConfig[protocol.meeting_type]
            const status = statusConfig[protocol.status]

            return (
              <Link
                key={protocol.id}
                href={`/dashboard/projects/${projectId}/protocols/${protocol.id}`}
                className={`block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all group ${typeConfig.bg}`}
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
                      <span className="text-blue-400 font-mono text-sm">
                        #{protocol.protocol_number}
                      </span>
                      <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                        {protocol.title}
                      </h3>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
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
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      {protocol.creator && (
                        <span className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
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
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Ta bort"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {paginatedProtocols.map((protocol) => {
            const typeConfig = meetingTypeConfig[protocol.meeting_type]
            const status = statusConfig[protocol.status]

            return (
              <Link
                key={protocol.id}
                href={`/dashboard/projects/${projectId}/protocols/${protocol.id}`}
                className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors group"
              >
                <span className="text-xl">{typeConfig.icon}</span>
                <span className="text-blue-400 font-mono text-sm w-12">#{protocol.protocol_number}</span>
                <span className="text-white font-medium flex-1 truncate group-hover:text-blue-400 transition-colors">{protocol.title}</span>
                <span className={`text-sm ${typeConfig.color} hidden sm:block`}>{typeConfig.label}</span>
                <span className="text-slate-400 text-sm hidden md:block">{formatDate(protocol.meeting_date)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.color}`}>{status.label}</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleDelete(protocol.id)
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6">
          <p className="text-sm text-slate-400">
            Visar {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProtocols.length)} av {filteredProtocols.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <CreateProtocolModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setPreselectedType(undefined)
        }}
        onCreate={handleCreate}
        members={members}
        existingProtocols={protocols}
        preselectedType={preselectedType}
      />
    </div>
  )
}
