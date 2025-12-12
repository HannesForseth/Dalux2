'use client'

import { useState, useEffect } from 'react'
import { DocumentVersionWithUploader } from '@/types/database'
import {
  getDocumentVersions,
  getVersionDownloadUrl,
  restoreVersion
} from '@/app/actions/documents'

interface VersionHistoryPanelProps {
  documentId: string
  documentName: string
  currentVersion: number
  onViewVersion: (url: string, version: number) => void
  onCompareVersions: (version1: number, version2: number) => void
  onVersionRestored?: () => void
  isPdf?: boolean
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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

function DocumentDuplicateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  )
}

export default function VersionHistoryPanel({
  documentId,
  documentName,
  currentVersion,
  onViewVersion,
  onCompareVersions,
  onVersionRestored,
  isPdf = false
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DocumentVersionWithUploader[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<number | null>(null)

  useEffect(() => {
    loadVersions()
  }, [documentId])

  const loadVersions = async () => {
    setLoading(true)
    const data = await getDocumentVersions(documentId)
    setVersions(data)
    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleViewVersion = async (version: DocumentVersionWithUploader) => {
    try {
      const url = await getVersionDownloadUrl(version.id)
      onViewVersion(url, version.version)
    } catch (error) {
      console.error('Error getting version URL:', error)
    }
  }

  const handleDownloadVersion = async (version: DocumentVersionWithUploader) => {
    try {
      const url = await getVersionDownloadUrl(version.id)
      const link = document.createElement('a')
      link.href = url
      link.download = `${documentName.replace(/\.[^/.]+$/, '')}_v${version.version}${documentName.match(/\.[^/.]+$/)?.[0] || ''}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading version:', error)
    }
  }

  const handleRestoreVersion = async (version: DocumentVersionWithUploader) => {
    if (!confirm(`Vill du återställa v${version.version}? Den nuvarande versionen sparas som en ny version i historiken.`)) {
      return
    }

    setRestoring(version.id)
    try {
      await restoreVersion(documentId, version.id)
      await loadVersions()
      onVersionRestored?.()
    } catch (error) {
      console.error('Error restoring version:', error)
      alert('Kunde inte återställa versionen')
    } finally {
      setRestoring(null)
    }
  }

  const handleCompareClick = (version: number) => {
    if (selectedForCompare === null) {
      setSelectedForCompare(version)
    } else if (selectedForCompare === version) {
      setSelectedForCompare(null)
    } else {
      onCompareVersions(selectedForCompare, version)
      setSelectedForCompare(null)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-4">
          <ClockIcon className="h-5 w-5" />
          <h3 className="font-medium text-white">Versionshistorik</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-4">
        <ClockIcon className="h-5 w-5" />
        <h3 className="font-medium text-white">Versionshistorik</h3>
      </div>

      {/* Current version */}
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
                v{currentVersion}
              </span>
              <span className="text-sm text-blue-400">Aktuell</span>
            </div>
            <p className="text-sm text-slate-300 mt-1">Nuvarande version</p>
          </div>
          {isPdf && selectedForCompare !== null && selectedForCompare !== currentVersion && (
            <button
              onClick={() => handleCompareClick(currentVersion)}
              className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
            >
              Jämför
            </button>
          )}
          {isPdf && selectedForCompare === null && versions.length > 0 && (
            <button
              onClick={() => handleCompareClick(currentVersion)}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
              title="Välj för jämförelse"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Version history */}
      {versions.length === 0 ? (
        <div className="text-center py-6 text-slate-500">
          <p className="text-sm">Ingen versionshistorik</p>
          <p className="text-xs mt-1">Versioner sparas när du laddar upp nya filer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedForCompare !== null && (
            <div className="p-2 bg-purple-900/20 border border-purple-700/50 rounded text-center">
              <p className="text-xs text-purple-400">
                v{selectedForCompare} vald - välj en annan version att jämföra med
              </p>
              <button
                onClick={() => setSelectedForCompare(null)}
                className="text-xs text-purple-300 hover:text-purple-200 mt-1"
              >
                Avbryt
              </button>
            </div>
          )}

          {versions.map((version) => (
            <div
              key={version.id}
              className={`p-3 rounded-lg border transition-colors ${
                selectedForCompare === version.version
                  ? 'bg-purple-900/20 border-purple-700/50'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 rounded">
                      v{version.version}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(version.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 mt-1">
                    {version.uploader?.full_name || 'Okänd användare'}
                  </p>

                  {version.change_note && (
                    <p className="text-sm text-slate-500 mt-1 italic">
                      "{version.change_note}"
                    </p>
                  )}

                  <p className="text-xs text-slate-600 mt-1">
                    {formatFileSize(version.file_size)}
                  </p>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  {isPdf && (
                    <button
                      onClick={() => handleCompareClick(version.version)}
                      className={`p-1.5 rounded transition-colors ${
                        selectedForCompare === version.version
                          ? 'bg-purple-600 text-white'
                          : selectedForCompare !== null
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'text-slate-400 hover:text-purple-400 hover:bg-slate-700'
                      }`}
                      title={selectedForCompare === version.version ? 'Vald för jämförelse' : 'Jämför versioner'}
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleViewVersion(version)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
                    title="Visa version"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDownloadVersion(version)}
                    className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded transition-colors"
                    title="Ladda ner version"
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleRestoreVersion(version)}
                    disabled={restoring === version.id}
                    className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                    title="Återställ version"
                  >
                    {restoring === version.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400"></div>
                    ) : (
                      <ArrowPathIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
