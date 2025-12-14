'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createCalendarEvent, type CreateCalendarEventData } from '@/app/actions/calendar'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  initialDate?: string | null
  onEventCreated?: () => void
}

type EventType = 'reminder' | 'meeting' | 'deadline' | 'milestone'

const EVENT_TYPE_OPTIONS: { value: EventType; label: string; description: string }[] = [
  { value: 'meeting', label: 'Möte', description: 'Byggmöte, projektmöte etc.' },
  { value: 'reminder', label: 'Påminnelse', description: 'Personlig påminnelse' },
  { value: 'deadline', label: 'Deadline', description: 'Viktigt datum att hålla' },
  { value: 'milestone', label: 'Milstolpe', description: 'Projektmilstolpe' },
]

const COLOR_OPTIONS = [
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'purple', label: 'Lila', class: 'bg-purple-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'emerald', label: 'Grön', class: 'bg-emerald-500' },
  { value: 'amber', label: 'Gul', class: 'bg-amber-500' },
  { value: 'red', label: 'Röd', class: 'bg-red-500' },
]

export default function CreateEventModal({ isOpen, onClose, projectId, initialDate, onEventCreated }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: initialDate || new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'reminder' as EventType,
    color: 'indigo'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update date when initialDate changes
  useState(() => {
    if (initialDate) {
      setFormData(prev => ({ ...prev, event_date: initialDate }))
    }
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Titel är obligatorisk')
      return
    }

    if (!formData.event_date) {
      setError('Datum är obligatoriskt')
      return
    }

    setIsSubmitting(true)
    try {
      const eventData: CreateCalendarEventData = {
        project_id: projectId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        event_date: formData.event_date,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        location: formData.location.trim() || undefined,
        event_type: formData.event_type,
        color: formData.color
      }

      await createCalendarEvent(eventData)

      // Reset form
      setFormData({
        title: '',
        description: '',
        event_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        location: '',
        event_type: 'reminder',
        color: 'indigo'
      })

      onEventCreated?.()
    } catch (err) {
      console.error('Failed to create event:', err)
      setError('Kunde inte skapa händelsen. Försök igen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Ny händelse</h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Typ</label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_TYPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, event_type: option.value }))}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.event_type === option.value
                        ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-medium text-slate-900">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Titel *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Vad handlar händelsen om?"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="event_date" className="block text-sm font-medium text-slate-700 mb-1">
                  Datum *
                </label>
                <input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-slate-700 mb-1">
                  Starttid
                </label>
                <input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-slate-700 mb-1">
                  Sluttid
                </label>
                <input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                Plats
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Var ska det ske?"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Beskrivning
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Ytterligare information..."
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Färg</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`w-8 h-8 rounded-full ${color.class} transition-all ${
                      formData.color === color.value
                        ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                        : 'hover:scale-105'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  'Skapa händelse'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
