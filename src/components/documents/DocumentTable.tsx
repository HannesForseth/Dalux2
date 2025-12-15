'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DocumentWithUploader } from '@/types/database'

interface DocumentTableProps {
  documents: DocumentWithUploader[]
  onView: (doc: DocumentWithUploader) => void
  onDownload: (docId: string) => Promise<void>
  onDelete: (docId: string) => Promise<void>
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getFileIcon(fileType: string): { icon: string; color: string } {
  if (fileType.startsWith('image/')) return { icon: 'image', color: 'text-purple-500' }
  if (fileType === 'application/pdf') return { icon: 'pdf', color: 'text-red-500' }
  if (fileType.includes('word') || fileType.includes('document')) return { icon: 'doc', color: 'text-blue-500' }
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return { icon: 'xls', color: 'text-green-500' }
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return { icon: 'ppt', color: 'text-orange-500' }
  if (fileType.includes('dwg') || fileType.includes('autocad')) return { icon: 'cad', color: 'text-cyan-500' }
  if (fileType.includes('ifc')) return { icon: 'bim', color: 'text-teal-500' }
  return { icon: 'file', color: 'text-slate-400' }
}

function FileTypeIcon({ fileType, className }: { fileType: string; className?: string }) {
  const { color } = getFileIcon(fileType)

  return (
    <div className={`${className} ${color} flex items-center justify-center`}>
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    </div>
  )
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  return (
    <svg
      className={`h-3 w-3 ml-1 ${active ? 'text-indigo-500' : 'text-slate-300'}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      )}
    </svg>
  )
}

export default function DocumentTable({
  documents,
  onView,
  onDownload,
  onDelete,
  sortField,
  sortDirection,
  onSort,
  selectedIds = new Set(),
  onSelectionChange
}: DocumentTableProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; doc: DocumentWithUploader } | null>(null)
  const [draggingIds, setDraggingIds] = useState<string[]>([])

  const handleDragStart = (e: React.DragEvent, doc: DocumentWithUploader) => {
    // If the document is selected, drag all selected documents
    // If not, drag just this document
    const idsToMove = selectedIds.has(doc.id) && selectedIds.size > 0
      ? Array.from(selectedIds)
      : [doc.id]

    setDraggingIds(idsToMove)

    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ documentIds: idsToMove }))

    // Create drag image
    const dragImage = document.createElement('div')
    dragImage.className = 'bg-white border border-indigo-300 rounded-lg px-3 py-2 text-slate-700 text-sm shadow-lg'
    dragImage.textContent = idsToMove.length > 1
      ? `${idsToMove.length} filer`
      : doc.name
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = () => {
    setDraggingIds([])
  }

  const toggleSelection = (docId: string, shiftKey: boolean) => {
    if (!onSelectionChange) return

    const newSelection = new Set(selectedIds)
    if (shiftKey && selectedIds.size > 0) {
      // Range selection
      const docIndex = documents.findIndex(d => d.id === docId)
      const lastSelectedIndex = documents.findIndex(d => selectedIds.has(d.id))
      const start = Math.min(docIndex, lastSelectedIndex)
      const end = Math.max(docIndex, lastSelectedIndex)
      for (let i = start; i <= end; i++) {
        newSelection.add(documents[i].id)
      }
    } else {
      if (newSelection.has(docId)) {
        newSelection.delete(docId)
      } else {
        newSelection.add(docId)
      }
    }
    onSelectionChange(newSelection)
  }

  const handleDownload = async (docId: string) => {
    setDownloadingId(docId)
    try {
      await onDownload(docId)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Är du säker på att du vill ta bort detta dokument?')) return

    setDeletingId(docId)
    try {
      await onDelete(docId)
    } finally {
      setDeletingId(null)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, doc: DocumentWithUploader) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, doc })
  }

  const closeContextMenu = () => setContextMenu(null)

  const columns = [
    { key: 'name', label: 'Filnamn', sortable: true },
    { key: 'file_type', label: 'Typ', sortable: true },
    { key: 'file_size', label: 'Storlek', sortable: true },
    { key: 'created_at', label: 'Uppladdad', sortable: true },
    { key: 'uploader', label: 'Uppladdad av', sortable: false },
    { key: 'version', label: 'Version', sortable: true },
  ]

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (selectedIds.size === documents.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(documents.map(d => d.id)))
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium mb-1 text-sm sm:text-base">Inga filer i denna mapp</p>
        <p className="text-xs sm:text-sm text-slate-400">Ladda upp filer eller välj en annan mapp</p>
      </div>
    )
  }

  return (
    <div onClick={closeContextMenu}>
      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-2 p-3">
        {documents.map((doc, index) => {
          const isSelected = selectedIds.has(doc.id)
          const isDragging = draggingIds.includes(doc.id)

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`bg-white border rounded-xl p-3 transition-colors ${
                isDragging
                  ? 'opacity-50 border-indigo-300 bg-indigo-50'
                  : isSelected
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => onView(doc)}
            >
              <div className="flex items-start gap-3">
                {/* Selection checkbox */}
                {onSelectionChange && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSelection(doc.id, e.shiftKey)
                    }}
                    onChange={() => {}}
                    className="mt-1 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                  />
                )}

                {/* File icon */}
                <FileTypeIcon fileType={doc.file_type} className="mt-0.5" />

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{doc.file_type.split('/').pop()?.toUpperCase()}</span>
                    <span>•</span>
                    <span>{formatBytes(doc.file_size)}</span>
                    <span>•</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                      v{doc.version}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {doc.uploader?.full_name || 'Okänd'} • {formatDate(doc.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(doc.id)
                    }}
                    disabled={downloadingId === doc.id}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Ladda ner"
                  >
                    {downloadingId === doc.id ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(doc.id)
                    }}
                    disabled={deletingId === doc.id}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Ta bort"
                  >
                    {deletingId === doc.id ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Desktop: Table layout */}
      <table className="hidden md:table w-full">
        <thead className="bg-slate-50/80 border-b border-slate-200">
          <tr>
            {onSelectionChange && (
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={documents.length > 0 && selectedIds.size === documents.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''
                }`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <div className="flex items-center">
                  {col.label}
                  {col.sortable && (
                    <SortIcon active={sortField === col.key} direction={sortDirection} />
                  )}
                </div>
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Åtgärder
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc, index) => {
            const isSelected = selectedIds.has(doc.id)
            const isDragging = draggingIds.includes(doc.id)

            return (
            <motion.tr
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              draggable
              onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, doc)}
              onDragEnd={handleDragEnd}
              className={`transition-colors cursor-grab active:cursor-grabbing ${
                isDragging
                  ? 'opacity-50 bg-indigo-50'
                  : isSelected
                  ? 'bg-indigo-50 hover:bg-indigo-100'
                  : 'hover:bg-slate-50'
              }`}
              onContextMenu={(e) => handleContextMenu(e, doc)}
            >
              {onSelectionChange && (
                <td className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSelection(doc.id, e.shiftKey)
                    }}
                    onChange={() => {}}
                    className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                  />
                </td>
              )}
              <td className="px-4 py-3">
                <button
                  onClick={() => onView(doc)}
                  className="flex items-center gap-3 text-left hover:text-indigo-600 transition-colors group"
                >
                  <FileTypeIcon fileType={doc.file_type} />
                  <span className="text-slate-800 font-medium group-hover:text-indigo-600 truncate max-w-[300px]">
                    {doc.name}
                  </span>
                </button>
              </td>
              <td className="px-4 py-3 text-slate-500 text-sm">
                {doc.file_type.split('/').pop()?.toUpperCase() || 'OKÄND'}
              </td>
              <td className="px-4 py-3 text-slate-500 text-sm">
                {formatBytes(doc.file_size)}
              </td>
              <td className="px-4 py-3 text-slate-500 text-sm">
                {formatDate(doc.created_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white flex-shrink-0 shadow-sm">
                    {doc.uploader?.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-slate-600 text-sm truncate max-w-[120px]">
                    {doc.uploader?.full_name || 'Okänd'}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  v{doc.version}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onView(doc)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Öppna"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDownload(doc.id)}
                    disabled={downloadingId === doc.id}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Ladda ner"
                  >
                    {downloadingId === doc.id ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Ta bort"
                  >
                    {deletingId === doc.id ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    )}
                  </button>
                </div>
              </td>
            </motion.tr>
          )})}
        </tbody>
      </table>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-[100] min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onView(contextMenu.doc)
                closeContextMenu()
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Öppna
            </button>
            <button
              onClick={() => {
                handleDownload(contextMenu.doc.id)
                closeContextMenu()
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Ladda ner
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => {
                handleDelete(contextMenu.doc.id)
                closeContextMenu()
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Ta bort
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
