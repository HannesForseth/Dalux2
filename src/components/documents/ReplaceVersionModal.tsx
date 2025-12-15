'use client'

import { useState } from 'react'
import { uploadNewVersion } from '@/app/actions/documents'
import type { Document } from '@/types/database'

interface ReplaceVersionModalProps {
  existingDocument: Document
  newFile: File
  onClose: () => void
  onReplaced: () => void
  onKeepBoth: () => void
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function DocumentDuplicateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  )
}

function ArrowPathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function DocumentPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

export default function ReplaceVersionModal({
  existingDocument,
  newFile,
  onClose,
  onReplaced,
  onKeepBoth
}: ReplaceVersionModalProps) {
  const [isReplacing, setIsReplacing] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleReplace = async () => {
    setIsReplacing(true)
    setError(null)

    try {
      await uploadNewVersion(existingDocument.id, newFile, changeNote || undefined)
      onReplaced()
    } catch (err) {
      console.error('Error replacing version:', err)
      setError(err instanceof Error ? err.message : 'Kunde inte ersätta dokumentet')
      setIsReplacing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white sm:bg-slate-900 border border-slate-200 sm:border-slate-700 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 sm:border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-amber-100 sm:bg-amber-900/30 rounded-lg">
              <DocumentDuplicateIcon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 sm:text-amber-500" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 sm:text-white">
              Dokumentet finns redan
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 sm:hover:text-white rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 space-y-4">
          <p className="text-slate-600 sm:text-slate-300 text-sm sm:text-base">
            Ett dokument med namnet <span className="font-medium text-slate-900 sm:text-white">{existingDocument.name}</span> finns
            redan i den här mappen. Vad vill du göra?
          </p>

          {/* Current document info */}
          <div className="p-3 bg-slate-100 sm:bg-slate-800/50 rounded-lg border border-slate-200 sm:border-slate-700/50">
            <p className="text-sm text-slate-500 sm:text-slate-400">Befintligt dokument:</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-slate-900 sm:text-white font-medium text-sm sm:text-base break-all">{existingDocument.name}</p>
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 sm:bg-slate-700 text-slate-600 sm:text-slate-300 rounded flex-shrink-0 ml-2">
                v{existingDocument.version}
              </span>
            </div>
            <p className="text-sm text-slate-500">{formatFileSize(existingDocument.file_size)}</p>
          </div>

          {/* New file info */}
          <div className="p-3 bg-blue-50 sm:bg-blue-900/20 rounded-lg border border-blue-200 sm:border-blue-700/50">
            <p className="text-sm text-blue-600 sm:text-blue-400">Ny fil:</p>
            <p className="text-slate-900 sm:text-white font-medium mt-1 text-sm sm:text-base break-all">{newFile.name}</p>
            <p className="text-sm text-slate-500">{formatFileSize(newFile.size)}</p>
          </div>

          {/* Change note input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1 sm:mb-2">
              Ändringsnotering (valfritt)
            </label>
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Beskriv vad som har ändrats..."
              rows={2}
              className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white placeholder-slate-400 sm:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 sm:bg-red-900/20 border border-red-200 sm:border-red-700/50 rounded-lg">
              <p className="text-sm text-red-600 sm:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-slate-200 sm:border-slate-700">
          {/* Primary action - Replace */}
          <button
            onClick={handleReplace}
            disabled={isReplacing}
            className="w-full px-4 py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {isReplacing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Ersätter...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-5 w-5" />
                Ersätt som v{existingDocument.version + 1}
              </>
            )}
          </button>

          {/* Secondary actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <button
              onClick={onKeepBoth}
              disabled={isReplacing}
              className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 bg-slate-100 sm:bg-slate-700 hover:bg-slate-200 sm:hover:bg-slate-600 text-slate-700 sm:text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              <DocumentPlusIcon className="h-4 w-4" />
              Behåll båda
            </button>
            <button
              onClick={onClose}
              disabled={isReplacing}
              className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 text-slate-600 sm:text-slate-300 hover:text-slate-900 sm:hover:text-white hover:bg-slate-100 sm:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 border border-slate-200 sm:border-transparent"
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
