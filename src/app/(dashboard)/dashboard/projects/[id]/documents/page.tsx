'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import FileUploader from '@/components/FileUploader'
import DocumentViewer from '@/components/DocumentViewer'
import AIFolderWizard from '@/components/AIFolderWizard'
import { getProjectDocuments, uploadDocument, deleteDocument, getDocumentDownloadUrl, getDocumentFolders } from '@/app/actions/documents'
import type { DocumentWithUploader } from '@/types/database'

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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return 'image'
  if (fileType === 'application/pdf') return 'pdf'
  if (fileType.includes('word') || fileType.includes('document')) return 'doc'
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'xls'
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'ppt'
  if (fileType.startsWith('text/')) return 'txt'
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return 'zip'
  return 'file'
}

function FileIcon({ type, className }: { type: string; className?: string }) {
  const iconType = getFileIcon(type)

  const colors: Record<string, string> = {
    pdf: 'text-red-400',
    doc: 'text-blue-400',
    xls: 'text-green-400',
    ppt: 'text-orange-400',
    image: 'text-purple-400',
    txt: 'text-slate-400',
    zip: 'text-yellow-400',
    file: 'text-slate-400'
  }

  return (
    <div className={`${className} ${colors[iconType]} bg-slate-800 rounded-lg flex items-center justify-center`}>
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    </div>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <div className={`${className} text-yellow-400 bg-slate-800 rounded-lg flex items-center justify-center`}>
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    </div>
  )
}

export default function ProjectDocumentsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [documents, setDocuments] = useState<DocumentWithUploader[]>([])
  const [folders, setFolders] = useState<string[]>(['/'])
  const [currentPath, setCurrentPath] = useState('/')
  const [isLoading, setIsLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewerDoc, setViewerDoc] = useState<{ url: string; name: string; type: string } | null>(null)
  const [showAIWizard, setShowAIWizard] = useState(false)

  const loadDocuments = useCallback(async () => {
    try {
      const [docs, allFolders] = await Promise.all([
        getProjectDocuments(projectId, currentPath),
        getDocumentFolders(projectId)
      ])
      setDocuments(docs)
      setFolders(allFolders)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, currentPath])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Get subfolders for current path
  const getSubfolders = useCallback(() => {
    const subfolders = new Set<string>()

    folders.forEach(folder => {
      if (folder === currentPath) return

      // Check if this folder is directly inside current path
      if (folder.startsWith(currentPath)) {
        const remaining = folder.slice(currentPath.length)
        const parts = remaining.split('/').filter(Boolean)
        if (parts.length > 0) {
          subfolders.add(parts[0])
        }
      }
    })

    // Also check documents for virtual folders
    documents.forEach(doc => {
      if (doc.folder_path !== currentPath && doc.folder_path.startsWith(currentPath)) {
        const remaining = doc.folder_path.slice(currentPath.length)
        const parts = remaining.split('/').filter(Boolean)
        if (parts.length > 0) {
          subfolders.add(parts[0])
        }
      }
    })

    return Array.from(subfolders).sort()
  }, [folders, documents, currentPath])

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
    setDownloadingId(documentId)
    try {
      const url = await getDocumentDownloadUrl(documentId)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to download document:', error)
    } finally {
      setDownloadingId(null)
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
    if (!confirm('Är du säker på att du vill ta bort detta dokument?')) return

    setDeletingId(documentId)
    try {
      await deleteDocument(documentId)
      await loadDocuments()
    } catch (error) {
      console.error('Failed to delete document:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath === '/'
      ? `/${folderName}/`
      : `${currentPath}${folderName}/`
    setCurrentPath(newPath)
    setIsLoading(true)
  }

  const navigateUp = () => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const newPath = parts.length === 0 ? '/' : `/${parts.join('/')}/`
    setCurrentPath(newPath)
    setIsLoading(true)
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return

    // Folders are virtual - we just set the path when uploading
    // For now, we'll add the folder to the list
    const newFolderPath = currentPath === '/'
      ? `/${newFolderName.trim()}/`
      : `${currentPath}${newFolderName.trim()}/`

    setFolders(prev => [...prev, newFolderPath])
    setNewFolderName('')
    setShowNewFolderModal(false)
  }

  const handleCreateAIFolders = async (folderPaths: string[]) => {
    // AI wizard returns paths like "/Ritningar", "/Ritningar/Arkitekt", etc.
    // Convert them to proper folder paths
    const newFolderPaths = folderPaths.map(path => {
      // Ensure path starts with / and ends with /
      let normalizedPath = path.startsWith('/') ? path : `/${path}`
      normalizedPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`
      return normalizedPath
    })

    // Add all new folders to the state
    setFolders(prev => {
      const existingSet = new Set(prev)
      const combined = [...prev]
      newFolderPaths.forEach(path => {
        if (!existingSet.has(path)) {
          combined.push(path)
          existingSet.add(path)
        }
      })
      return combined
    })
  }

  // Get breadcrumb parts
  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean)
    const breadcrumbs = [{ name: 'Dokument', path: '/' }]

    let currentBreadcrumbPath = '/'
    parts.forEach(part => {
      currentBreadcrumbPath += `${part}/`
      breadcrumbs.push({ name: part, path: currentBreadcrumbPath })
    })

    return breadcrumbs
  }

  const subfolders = getSubfolders()
  const currentDocuments = documents.filter(doc => doc.folder_path === currentPath)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
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
          <h1 className="text-2xl font-bold text-white">Dokument</h1>
          <span className="text-slate-500">({documents.length} totalt)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIWizard(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-blue-500 transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            AI Mappstruktur
          </button>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            Ny mapp
          </button>
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Ladda upp
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        {getBreadcrumbs().map((crumb, index, arr) => (
          <div key={crumb.path} className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentPath(crumb.path)
                setIsLoading(true)
              }}
              className={`hover:text-white transition-colors ${
                index === arr.length - 1 ? 'text-white font-medium' : 'text-slate-400'
              }`}
            >
              {crumb.name}
            </button>
            {index < arr.length - 1 && (
              <span className="text-slate-600">/</span>
            )}
          </div>
        ))}
      </div>

      {showUploader && (
        <div className="mb-6">
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

      {subfolders.length === 0 && currentDocuments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {currentPath === '/' ? 'Inga dokument än' : 'Mappen är tom'}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {currentPath === '/'
              ? 'Ladda upp och organisera projektdokument som ritningar, specifikationer och rapporter.'
              : 'Ladda upp filer eller skapa undermappar för att organisera dina dokument.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
            >
              Skapa mapp
            </button>
            <button
              onClick={() => setShowUploader(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
            >
              Ladda upp dokument
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Namn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Storlek
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Uppladdad av
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {/* Back button if not at root */}
              {currentPath !== '/' && (
                <tr
                  onClick={navigateUp}
                  className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4" colSpan={5}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 text-slate-400 bg-slate-800 rounded-lg flex items-center justify-center">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                        </svg>
                      </div>
                      <span className="text-slate-400">..</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Subfolders */}
              {subfolders.map((folder) => (
                <tr
                  key={folder}
                  onClick={() => navigateToFolder(folder)}
                  className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FolderIcon className="w-10 h-10" />
                      <span className="text-white font-medium">{folder}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">—</td>
                  <td className="px-6 py-4 text-slate-400">—</td>
                  <td className="px-6 py-4 text-slate-400">—</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Documents */}
              {currentDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileIcon type={doc.file_type} className="w-10 h-10" />
                      <div>
                        <button
                          onClick={() => handleView(doc)}
                          className="text-white font-medium hover:text-blue-400 transition-colors text-left"
                        >
                          {doc.name}
                        </button>
                        {doc.description && (
                          <p className="text-slate-500 text-sm">{doc.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {formatBytes(doc.file_size)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
                        {doc.uploader?.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-slate-400 text-sm">
                        {doc.uploader?.full_name || 'Okänd'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(doc)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Visa"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownload(doc.id)}
                        disabled={downloadingId === doc.id}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        title="Ladda ner"
                      >
                        {downloadingId === doc.id ? (
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        title="Ta bort"
                      >
                        {deletingId === doc.id ? (
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  if (e.key === 'Enter') createFolder()
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
                onClick={createFolder}
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
