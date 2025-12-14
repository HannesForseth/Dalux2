'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCalendarEvents, getUpcomingEvents, type CalendarEvent } from '@/app/actions/calendar'

interface MiniCalendarProps {
  projectId: string
  onExpandClick: () => void
}

const WEEKDAYS = ['må', 'ti', 'on', 'to', 'fr', 'lö', 'sö']
const MONTHS = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december'
]

export default function MiniCalendar({ projectId, onExpandClick }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    loadEvents()
  }, [projectId, year, month])

  async function loadEvents() {
    setIsLoading(true)
    try {
      // Get first and last day of current month
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const [monthEvents, upcoming] = await Promise.all([
        getCalendarEvents(
          projectId,
          firstDay.toISOString().split('T')[0],
          lastDay.toISOString().split('T')[0]
        ),
        getUpcomingEvents(projectId, 7)
      ])

      setEvents(monthEvents)
      setUpcomingEvents(upcoming.slice(0, 4))
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

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    // Convert to Monday = 0
    let startDay = firstDayOfMonth.getDay() - 1
    if (startDay < 0) startDay = 6

    const days: (number | null)[] = []

    // Add empty slots for days before the month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  function getEventsForDay(day: number): CalendarEvent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  function isToday(day: number): boolean {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(selectedDate === dateStr ? null : dateStr)
  }

  const days = getDaysInMonth()
  const selectedDayEvents = selectedDate
    ? events.filter(e => e.date === selectedDate)
    : []

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-indigo-500'
      case 'issue_deadline': return 'bg-amber-500'
      case 'deviation_deadline': return 'bg-red-500'
      case 'action_deadline': return 'bg-purple-500'
      case 'reminder': return 'bg-cyan-500'
      case 'milestone': return 'bg-emerald-500'
      default: return 'bg-slate-500'
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900 capitalize">
            {MONTHS[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onExpandClick}
            className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-1"
            title="Expandera kalender"
          >
            <ExpandIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-8" />
          }

          const dayEvents = getEventsForDay(day)
          const hasEvents = dayEvents.length > 0
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = selectedDate === dateStr

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`h-8 relative flex items-center justify-center rounded-lg text-sm transition-all ${
                isToday(day)
                  ? 'bg-indigo-600 text-white font-semibold'
                  : isSelected
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {day}
              {hasEvents && !isToday(day) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full ${getEventTypeColor(e.type)}`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day events */}
      <AnimatePresence>
        {selectedDate && selectedDayEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-slate-100"
          >
            <p className="text-xs font-medium text-slate-500 mb-2">
              {new Date(selectedDate).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="space-y-1.5">
              {selectedDayEvents.map(event => (
                <a
                  key={event.id}
                  href={event.link}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <span className={`w-2 h-2 rounded-full ${getEventTypeColor(event.type)}`} />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 truncate flex-1">
                    {event.title}
                  </span>
                  {event.startTime && (
                    <span className="text-xs text-slate-400">{event.startTime.slice(0, 5)}</span>
                  )}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming events */}
      {!selectedDate && upcomingEvents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">Kommande händelser</p>
          <div className="space-y-1.5">
            {upcomingEvents.map(event => (
              <a
                key={event.id}
                href={event.link}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 ${getEventTypeColor(event.type)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 group-hover:text-slate-900 truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(event.date).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {event.startTime && ` ${event.startTime.slice(0, 5)}`}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!selectedDate && upcomingEvents.length === 0 && !isLoading && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-400">Inga kommande händelser</p>
        </div>
      )}

      {isLoading && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-center">
          <motion.div
            className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  )
}

// Icons
function CalendarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ChevronLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ExpandIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  )
}
