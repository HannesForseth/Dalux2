'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import FileUploader from '@/components/FileUploader'
import AIFolderWizard from '@/components/AIFolderWizard'
import FolderTree from '@/components/documents/FolderTree'
import DocumentTable from '@/components/documents/DocumentTable'
import { getProjectDocuments, uploadDocument, deleteDocument, getDocumentDownloadUrl } from '@/app/actions/documents'
import { getAllFolderPaths, createFolder, createMultipleFolders } from '@/app/actions/folders'
import type { DocumentWithUploader } from '@/types/database'

// Dynamically import DocumentViewer to avoid SSR issues with react-pdf
const DocumentViewer = dynamic(() => import('@/components/DocumentViewer'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
})

export default function ProjectDocumentsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [allDocuments, setAllDocuments] = useState<DocumentWithUploader[]>([])
  const [folders, setFolders] = useState<string[]>(['/'])
  const [currentPath, setCurrentPath] = useState('/')
  const [isLoading, setIsLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [viewerDoc, setViewerDoc] = useState<{ url: string; name: string; type: string } | null>(null)
  const [showAIWizard, setShowAIWizard] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const loadDocuments = useCallback(async () => {
    try {
      const [docs, allFolders] = await Promise.all([
        getProjectDocuments(projectId),
        getAllFolderPaths(projectId)
      ])
      setAllDocuments(docs)
      setFolders(allFolders)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Calculate document counts per folder
  const documentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allDocuments.forEach(doc => {
      const path = doc.folder_path || '/'
      counts[path] = (counts[path] || 0) + 1
    })
    return counts
  }, [allDocuments])

  // Filter and sort documents for current path
  const currentDocuments = useMemo(() => {
    let docs = allDocuments.filter(doc => doc.folder_path === currentPath)

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      docs = docs.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.uploader?.full_name?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    docs.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'file_type':
          aVal = a.file_type
          bVal = b.file_type
          break
        case 'file_size':
          aVal = a.file_size
          bVal = b.file_size
          break
        case 'created_at':
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        case 'version':
          aVal = a.version
          bVal = b.version
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return docs
  }, [allDocuments, currentPath, searchQuery, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleUpload = async (file: File) => {
    await uploadDocument(projectId, file, {
      name: file.name,
      folder_path: currentPath
    })
    await loadDocuments()
    setShowUploader(false)
  }

  const handleMultipleUpload = async (files: File[]) => {
    for (const file of files) {
      await uploadDocument(projectId, file, {
        name: file.name,
        folder_path: currentPath
      })
    }
    await loadDocuments()
    setShowUploader(false)
  }

  const handleDownload = async (documentId: string) => {
    try {
      const url = await getDocumentDownloadUrl(documentId)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const handleView = async (doc: DocumentWithUploader) => {
    try {
      const url = await getDocumentDownloadUrl(doc.id)
      setViewerDoc({ url, name: doc.name, type: doc.file_type })
    } catch (error) {
      console.error('Failed to get document URL:', error)
    }
  }

  const handleDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId)
      await loadDocuments()
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    const folderName = newFolderName.trim()
    const newFolderPath = currentPath === '/'
      ? `/${folderName}/`
      : `${currentPath}${folderName}/`

    try {
      await createFolder(projectId, {
        name: folderName,
        path: newFolderPath,
        parent_path: currentPath,
      })
      // Reload to get updated folder list
      await loadDocuments()
    } catch (error) {
      console.error('Failed to create folder:', error)
      alert(error instanceof Error ? error.message : 'Kunde inte skapa mappen')
    } finally {
      setNewFolderName('')
      setShowNewFolderModal(false)
    }
  }

  const handleCreateAIFolders = async (folderPaths: string[]) => {
    // Convert AI paths to folder data
    const foldersToCreate = folderPaths.map(path => {
      let normalizedPath = path.startsWith('/') ? path : `/${path}`
      normalizedPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`

      // Extract name and parent path
      const parts = normalizedPath.split('/').filter(Boolean)
      const name = parts[parts.length - 1]
      const parentPath = parts.length > 1
        ? '/' + parts.slice(0, -1).join('/') + '/'
        : '/'

      return {
        name,
        path: normalizedPath,
        parent_path: parentPath,
      }
    })

    try {
      await createMultipleFolders(projectId, foldersToCreate)
      // Reload to get updated folder list
      await loadDocuments()
    } catch (error) {
      console.error('Failed to create AI folders:', error)
      alert(error instanceof Error ? error.message : 'Kunde inte skapa mapparna')
    }
  }

  // Build breadcrumb
  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean)
    const breadcrumbs = [{ name: 'Filer', path: '/' }]

    let currentBreadcrumbPath = '/'
    parts.forEach(part => {
      currentBreadcrumbPath += `${part}/`
      breadcrumbs.push({ name: part, path: currentBreadcrumbPath })
    })

    return breadcrumbs
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Ladda upp
          </button>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            Ny mapp
          </button>
          <button
            onClick={() => setShowAIWizard(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-blue-500 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            AI Struktur
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök..."
              className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            <button className="p-1.5 bg-slate-700 text-white rounded" title="Listvy">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </button>
            <button className="p-1.5 text-slate-500 hover:text-white rounded" title="Rutnät">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Upload area */}
      {showUploader && (
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800">
          <FileUploader
            onUpload={handleUpload}
            onMultipleUpload={handleMultipleUpload}
            multiple={true}
            accept={{
              'application/pdf': ['.pdf'],
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'application/vnd.ms-excel': ['.xls'],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'text/csv': ['.csv'],
              'application/vnd.ms-powerpoint': ['.ppt'],
              'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
              'text/plain': ['.txt'],
              'application/zip': ['.zip'],
            }}
          />
          <button
            onClick={() => setShowUploader(false)}
            className="mt-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Avbryt
          </button>
        </div>
      )}

      {/* Main content with split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Folder tree */}
        <div
          className={`${
            sidebarCollapsed ? 'w-0' : 'w-64'
          } flex-shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto transition-all duration-200`}
        >
          {!sidebarCollapsed && (
            <FolderTree
              folders={folders}
              documentCounts={documentCounts}
              currentPath={currentPath}
              onSelectFolder={setCurrentPath}
            />
          )}
        </div>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex-shrink-0 w-4 bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <svg
            className={`h-4 w-4 text-slate-500 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Right side - Document list */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border-b border-slate-800 text-sm">
            {getBreadcrumbs().map((crumb, index, arr) => (
              <div key={crumb.path} className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPath(crumb.path)}
                  className={`hover:text-white transition-colors ${
                    index === arr.length - 1 ? 'text-white font-medium' : 'text-slate-400'
                  }`}
                >
                  {crumb.name}
                </button>
                {index < arr.length - 1 && (
                  <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </div>
            ))}
            <span className="text-slate-500 ml-auto">
              {currentDocuments.length} {currentDocuments.length === 1 ? 'fil' : 'filer'}
            </span>
          </div>

          {/* Document table */}
          <div className="flex-1 overflow-auto">
            <DocumentTable
              documents={currentDocuments}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
        fileUrl={viewerDoc?.url || ''}
        fileName={viewerDoc?.name || ''}
        fileType={viewerDoc?.type || ''}
      />

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Skapa ny mapp</h2>
              <button
                onClick={() => {
                  setShowNewFolderModal(false)
                  setNewFolderName('')
                }}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Mappnamn
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="t.ex. Ritningar, Kontrakt..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                }}
              />
              <p className="mt-2 text-xs text-slate-500">
                Mappen skapas i: {currentPath === '/' ? 'Rot' : currentPath}
              </p>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewFolderModal(false)
                  setNewFolderName('')
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Skapa mapp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Folder Wizard */}
      <AIFolderWizard
        isOpen={showAIWizard}
        onClose={() => setShowAIWizard(false)}
        onCreateFolders={handleCreateAIFolders}
      />
    </div>
  )
}
