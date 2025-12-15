'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCalendarEvents, type CalendarEvent } from '@/app/actions/calendar'
import CreateEventModal from './CreateEventModal'

interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onEventCreated?: () => void  // Called when a new event is created
}

const WEEKDAYS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag']
const WEEKDAYS_SHORT = ['må', 'ti', 'on', 'to', 'fr', 'lö', 'sö']
const MONTHS = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december'
]

type EventTypeFilter = 'meeting' | 'issue_deadline' | 'deviation_deadline' | 'action_deadline' | 'reminder' | 'milestone'

const EVENT_TYPE_LABELS: Record<EventTypeFilter, string> = {
  meeting: 'Möten',
  issue_deadline: 'Ärenden',
  deviation_deadline: 'Avvikelser',
  action_deadline: 'Åtgärder',
  reminder: 'Påminnelser',
  milestone: 'Milstolpar'
}

export default function CalendarModal({ isOpen, onClose, projectId, onEventCreated }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<Set<EventTypeFilter>>(new Set(['meeting', 'issue_deadline', 'deviation_deadline', 'action_deadline', 'reminder', 'milestone']))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createModalDate, setCreateModalDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    if (isOpen) {
      loadEvents()
    }
  }, [isOpen, projectId, year, month])

  async function loadEvents() {
    setIsLoading(true)
    try {
      // Get first and last day of current month, plus extra days for display
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const monthEvents = await getCalendarEvents(
        projectId,
        firstDay.toISOString().split('T')[0],
        lastDay.toISOString().split('T')[0]
      )

      setEvents(monthEvents)
    } catch (error) {
      console.error('Failed to load calendar events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function getDaysInMonth(): (number | null)[] {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const daysInMonth = lastDayOfMonth.getDate()

    // Convert to Monday = 0
    let startDay = firstDayOfMonth.getDay() - 1
    if (startDay < 0) startDay = 6

    const days: (number | null)[] = []

    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  function getEventsForDay(day: number): CalendarEvent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr && filters.has(e.type as EventTypeFilter))
  }

  function isToday(day: number): boolean {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  function toggleFilter(type: EventTypeFilter) {
    const newFilters = new Set(filters)
    if (newFilters.has(type)) {
      newFilters.delete(type)
    } else {
      newFilters.add(type)
    }
    setFilters(newFilters)
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(selectedDate === dateStr ? null : dateStr)
  }

  function handleDayDoubleClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setCreateModalDate(dateStr)
    setShowCreateModal(true)
  }

  function handleCreateEvent() {
    setCreateModalDate(selectedDate)
    setShowCreateModal(true)
  }

  function handleEventCreated() {
    setShowCreateModal(false)
    setCreateModalDate(null)
    loadEvents()
    onEventCreated?.()  // Notify parent to refresh other components
  }

  const days = getDaysInMonth()
  const filteredEvents = events.filter(e => filters.has(e.type as EventTypeFilter))
  const selectedDayEvents = selectedDate
    ? filteredEvents.filter(e => e.date === selectedDate)
    : []

  // Group events by date for the sidebar
  const eventsByDate = filteredEvents.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = []
    acc[event.date].push(event)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  const sortedDates = Object.keys(eventsByDate).sort()

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' }
      case 'issue_deadline': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' }
      case 'deviation_deadline': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
      case 'action_deadline': return { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' }
      case 'reminder': return { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' }
      case 'milestone': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' }
      default: return { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' }
    }
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return '🏗️'
      case 'issue_deadline': return '⚠️'
      case 'deviation_deadline': return '🛡️'
      case 'action_deadline': return '📌'
      case 'reminder': return '🔔'
      case 'milestone': return '🎯'
      default: return '📅'
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Projektkalender</h2>
                <p className="text-slate-500 text-sm">{filteredEvents.length} händelser denna månad</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Ny händelse
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-semibold text-slate-900 min-w-[180px] text-center capitalize">
                {MONTHS[month]} {year}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="ml-2 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Idag
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(EVENT_TYPE_LABELS) as EventTypeFilter[]).map(type => {
                const colors = getEventTypeColor(type)
                const isActive = filters.has(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleFilter(type)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? `${colors.bg} ${colors.text} font-medium`
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? colors.dot : 'bg-slate-300'}`} />
                    {EVENT_TYPE_LABELS[type]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Calendar grid */}
            <div className="flex-1 p-6 overflow-auto">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEKDAYS_SHORT.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="h-24" />
                  }

                  const dayEvents = getEventsForDay(day)
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isSelected = selectedDate === dateStr
                  const today = isToday(day)

                  return (
                    <motion.button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      onDoubleClick={() => handleDayDoubleClick(day)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`h-24 p-2 rounded-xl border text-left transition-all flex flex-col ${
                        today
                          ? 'bg-indigo-50 border-indigo-200'
                          : isSelected
                          ? 'bg-slate-50 border-indigo-300 ring-2 ring-indigo-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <span className={`text-sm font-medium ${today ? 'text-indigo-600' : 'text-slate-700'}`}>
                        {day}
                      </span>
                      <div className="flex-1 mt-1 space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map(event => {
                          const colors = getEventTypeColor(event.type)
                          return (
                            <div
                              key={event.id}
                              className={`text-xs px-1.5 py-0.5 rounded truncate ${colors.bg} ${colors.text}`}
                            >
                              {event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-slate-400 px-1">
                            +{dayEvents.length - 3} fler
                          </div>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Sidebar - Events list */}
            <div className="w-80 border-l border-slate-100 bg-slate-50/50 flex flex-col">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Händelser'}
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <motion.div
                      className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                ) : selectedDate && selectedDayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayEvents.map(event => {
                      const colors = getEventTypeColor(event.type)
                      return (
                        <a
                          key={event.id}
                          href={event.link}
                          className="block p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg">{getEventTypeIcon(event.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{event.title}</p>
                              {event.description && (
                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{event.description}</p>
                              )}
                              {event.startTime && (
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  {event.startTime.slice(0, 5)}
                                  {event.endTime && ` - ${event.endTime.slice(0, 5)}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                ) : selectedDate ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-3">Inga händelser denna dag</p>
                    <button
                      onClick={() => handleDayDoubleClick(parseInt(selectedDate.split('-')[2]))}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      + Lägg till händelse
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedDates.map(date => (
                      <div key={date}>
                        <p className="text-xs font-medium text-slate-400 mb-2">
                          {new Date(date).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <div className="space-y-2">
                          {eventsByDate[date].map(event => {
                            const colors = getEventTypeColor(event.type)
                            return (
                              <a
                                key={event.id}
                                href={event.link}
                                className={`block p-2 rounded-lg ${colors.bg} hover:opacity-80 transition-opacity`}
                              >
                                <p className={`text-sm font-medium ${colors.text} truncate`}>{event.title}</p>
                                {event.startTime && (
                                  <p className="text-xs opacity-75 mt-0.5">{event.startTime.slice(0, 5)}</p>
                                )}
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {sortedDates.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        Inga händelser denna månad
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setCreateModalDate(null)
        }}
        projectId={projectId}
        initialDate={createModalDate}
        onEventCreated={handleEventCreated}
      />
    </AnimatePresence>
  )
}

// Icons
function CalendarIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ChevronLeftIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function XIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function PlusIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
