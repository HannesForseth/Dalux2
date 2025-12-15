'use client'

import { useState, useRef, useCallback } from 'react'
import { uploadNewVersion } from '@/app/actions/documents'

interface UploadVersionModalProps {
  documentId: string
  documentName: string
  currentVersion: number
  onClose: () => void
  onSuccess: () => void
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function CloudArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

export default function UploadVersionModal({
  documentId,
  documentName,
  currentVersion,
  onClose,
  onSuccess
}: UploadVersionModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [changeNote, setChangeNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    setError(null)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      await uploadNewVersion(documentId, file, changeNote || undefined)
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error uploading version:', err)
      setError(err instanceof Error ? err.message : 'Kunde inte ladda upp filen')
    } finally {
      setUploading(false)
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
          <h2 className="text-lg font-semibold text-slate-900 sm:text-white">
            Ladda upp ny version
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 sm:hover:text-white rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 space-y-4">
          {/* Current document info */}
          <div className="p-3 bg-slate-100 sm:bg-slate-800/50 rounded-lg border border-slate-200 sm:border-slate-700/50">
            <p className="text-sm text-slate-500 sm:text-slate-400">Nuvarande dokument:</p>
            <p className="text-slate-900 sm:text-white font-medium">{documentName}</p>
            <p className="text-sm text-slate-500">Version {currentVersion}</p>
          </div>

          {/* File drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-500/10'
                : file
                ? 'border-green-500/50 bg-green-50 sm:bg-green-500/10'
                : 'border-slate-300 sm:border-slate-600 hover:border-slate-400 sm:hover:border-slate-500 hover:bg-slate-50 sm:hover:bg-slate-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <DocumentIcon className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
                <div>
                  <p className="text-slate-900 sm:text-white font-medium text-sm sm:text-base break-all">{file.name}</p>
                  <p className="text-sm text-slate-500 sm:text-slate-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  className="text-sm text-slate-500 sm:text-slate-400 hover:text-red-500 sm:hover:text-red-400 transition-colors py-1"
                >
                  Ta bort
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <CloudArrowUpIcon className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 sm:text-slate-500" />
                <div>
                  <p className="text-slate-900 sm:text-white font-medium">Välj fil</p>
                  <p className="text-sm text-slate-500 hidden sm:block">eller dra och släpp här</p>
                </div>
              </div>
            )}
          </div>

          {/* Change note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1 sm:mb-2">
              Ändringsnotering (valfritt)
            </label>
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Beskriv vad som har ändrats..."
              rows={3}
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
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-slate-200 sm:border-slate-700">
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-600 sm:text-slate-300 hover:text-slate-900 sm:hover:text-white transition-colors disabled:opacity-50 border border-slate-200 sm:border-transparent rounded-lg sm:rounded-none"
          >
            Avbryt
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Laddar upp...
              </>
            ) : (
              <>Ladda upp v{currentVersion + 1}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
