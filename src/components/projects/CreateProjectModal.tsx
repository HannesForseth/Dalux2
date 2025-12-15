'use client'

import { useState } from 'react'
import { createProject } from '@/app/actions/projects'
import type { CreateProjectData } from '@/types/database'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data: CreateProjectData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      project_number: formData.get('project_number') as string || undefined,
      address: formData.get('address') as string || undefined,
      city: formData.get('city') as string || undefined,
      start_date: formData.get('start_date') as string || undefined,
      end_date: formData.get('end_date') as string || undefined,
    }

    try {
      await createProject(data)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white sm:bg-slate-900 border border-slate-200 sm:border-slate-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center mb-3">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>

          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 sm:text-white">Skapa nytt projekt</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 sm:hover:text-white transition-colors"
            >
              <XIcon />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                Projektnamn *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white placeholder-slate-400 sm:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="T.ex. Nybyggnation Storgatan 5"
              />
            </div>

            <div>
              <label htmlFor="project_number" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                Projektnummer
              </label>
              <input
                type="text"
                id="project_number"
                name="project_number"
                className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white placeholder-slate-400 sm:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="T.ex. 2024-001"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                Beskrivning
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white placeholder-slate-400 sm:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Kort beskrivning av projektet..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                  Adress
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white placeholder-slate-400 sm:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Storgatan 5"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                  Stad
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white placeholder-slate-400 sm:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Stockholm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                  Slutdatum
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-slate-600 sm:text-slate-300 hover:text-slate-900 sm:hover:text-white transition-colors border border-slate-200 sm:border-transparent rounded-lg sm:rounded-none"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Skapar...' : 'Skapa projekt'}
              </button>
            </div>
          </form>
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
