'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FolderPlus, Folder, Sparkles, Search, List, Grid3X3, ChevronLeft, ChevronRight, X } from 'lucide-react'
import FileUploader from '@/components/FileUploader'
import AIFolderWizard from '@/components/AIFolderWizard'
import FolderTree from '@/components/documents/FolderTree'
import DocumentTable from '@/components/documents/DocumentTable'
import ReplaceVersionModal from '@/components/documents/ReplaceVersionModal'
import { getProjectDocuments, deleteDocument, getDocumentDownloadUrl, moveMultipleDocuments, checkDuplicateDocument, getDocumentUploadUrl, createDocumentAfterUpload } from '@/app/actions/documents'
import { uploadFileDirectly, formatFileSize } from '@/lib/directUpload'
import { getAllFolderPaths, createFolder, createMultipleFolders, renameFolder, deleteFolder } from '@/app/actions/folders'
import type { Document, DocumentWithUploader } from '@/types/database'

// Dynamically import DocumentViewer to avoid SSR issues with react-pdf
const DocumentViewer = dynamic(() => import('@/components/DocumentViewer'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
})

export default function ProjectDocumentsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = params.id as string

  // Track if we've already handled the deep link to prevent re-opening
  const deepLinkHandled = useRef(false)

  const [allDocuments, setAllDocuments] = useState<DocumentWithUploader[]>([])
  const [folders, setFolders] = useState<string[]>(['/'])
  const [currentPath, setCurrentPath] = useState('/')
  const [isLoading, setIsLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [viewerDoc, setViewerDoc] = useState<{ url: string; name: string; type: string; id: string; version: number; initialPage?: number } | null>(null)
  const [showAIWizard, setShowAIWizard] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [isMoving, setIsMoving] = useState(false)
  const [subfolderParent, setSubfolderParent] = useState<string | null>(null)
  const [renameFolderPath, setRenameFolderPath] = useState<string | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState('')
  const [duplicateCheck, setDuplicateCheck] = useState<{
    existingDoc: Document
    newFile: File
    remainingFiles: File[]
  } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number } | null>(null)

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

  // Expand sidebar on desktop by default
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarCollapsed(false)
    }
  }, [])

  // Handle notification deep links - open document from URL params
  useEffect(() => {
    const docId = searchParams.get('doc')
    const page = searchParams.get('page')
    const folder = searchParams.get('folder')

    // Only handle deep link once, and only if we have documents loaded
    if (docId && allDocuments.length > 0 && !deepLinkHandled.current) {
      const doc = allDocuments.find(d => d.id === docId)
      if (doc) {
        // Mark as handled so we don't re-open when viewer is closed
        deepLinkHandled.current = true

        // Navigate to the folder first
        if (folder) {
          setCurrentPath(folder)
        }

        // Open the document viewer
        const openDocument = async () => {
          const url = await getDocumentDownloadUrl(doc.id)
          if (url) {
            setViewerDoc({
              url,
              name: doc.name,
              type: doc.file_type,
              id: doc.id,
              version: doc.version,
              initialPage: page ? parseInt(page, 10) : undefined
            })
          }

          // Clear URL params to keep URL clean
          router.replace(`/dashboard/projects/${projectId}/documents`, { scroll: false })
        }
        openDocument()
      }
    }
  }, [searchParams, allDocuments, router, projectId])

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

  // Helper to process a single file upload with duplicate checking (using direct upload)
  const processFileUpload = async (file: File, remainingFiles: File[] = []) => {
    // Check if file with same name exists in current folder
    const existingDoc = await checkDuplicateDocument(projectId, file.name, currentPath)

    if (existingDoc) {
      // Show replace/keep modal
      setDuplicateCheck({
        existingDoc,
        newFile: file,
        remainingFiles
      })
      return false // Indicates we're waiting for user decision
    }

    // No duplicate, upload using direct upload (bypasses Vercel 4.5MB limit)
    try {
      // 1. Get signed upload URL from server
      const { signedUrl, path } = await getDocumentUploadUrl(projectId, file.name)

      // 2. Upload directly to Supabase Storage with progress tracking
      setUploadProgress({ fileName: file.name, progress: 0 })
      const uploadResult = await uploadFileDirectly(signedUrl, file, (progress) => {
        setUploadProgress({ fileName: file.name, progress })
      })

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Uppladdning misslyckades')
      }

      // 3. Create database record
      await createDocumentAfterUpload(projectId, path, file.size, file.type, {
        name: file.name,
        folder_path: currentPath
      })

      setUploadProgress(null)
      return true
    } catch (error) {
      setUploadProgress(null)
      console.error('Direct upload failed:', error)
      throw error
    }
  }

  const handleUpload = async (file: File) => {
    const uploaded = await processFileUpload(file)
    if (uploaded) {
      await loadDocuments()
      setShowUploader(false)
    }
  }

  const handleMultipleUpload = async (files: File[]) => {
    // Process files one by one, checking for duplicates
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const remainingFiles = files.slice(i + 1)
      const uploaded = await processFileUpload(file, remainingFiles)

      if (!uploaded) {
        // Duplicate found, stop and wait for user decision
        // The remaining files are stored in duplicateCheck state
        return
      }
    }
    await loadDocuments()
    setShowUploader(false)
  }

  // Handler when user replaces existing document with new version
  const handleDuplicateReplaced = async () => {
    setDuplicateCheck(null)

    // Continue with remaining files if any
    if (duplicateCheck?.remainingFiles && duplicateCheck.remainingFiles.length > 0) {
      await handleMultipleUpload(duplicateCheck.remainingFiles)
    } else {
      await loadDocuments()
      setShowUploader(false)
    }
  }

  // Handler when user chooses to keep both (upload with modified name)
  const handleKeepBoth = async () => {
    if (!duplicateCheck) return

    const file = duplicateCheck.newFile
    const remainingFiles = duplicateCheck.remainingFiles

    // Generate a unique name by adding a number suffix
    const nameParts = file.name.split('.')
    const extension = nameParts.length > 1 ? nameParts.pop() : ''
    const baseName = nameParts.join('.')
    let newName = `${baseName} (1).${extension}`

    // Check if the new name also exists and increment if needed
    let counter = 1
    while (true) {
      const check = await checkDuplicateDocument(projectId, newName, currentPath)
      if (!check) break
      counter++
      newName = `${baseName} (${counter}).${extension}`
      if (counter > 100) break // Safety limit
    }

    // Upload with new name using direct upload (bypasses Vercel 4.5MB limit)
    try {
      // 1. Get signed upload URL
      const { signedUrl, path } = await getDocumentUploadUrl(projectId, newName)

      // 2. Upload directly to Supabase Storage
      setUploadProgress({ fileName: newName, progress: 0 })
      const uploadResult = await uploadFileDirectly(signedUrl, file, (progress) => {
        setUploadProgress({ fileName: newName, progress })
      })

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Uppladdning misslyckades')
      }

      // 3. Create database record
      await createDocumentAfterUpload(projectId, path, file.size, file.type, {
        name: newName,
        folder_path: currentPath
      })

      setUploadProgress(null)
    } catch (error) {
      setUploadProgress(null)
      console.error('Direct upload failed:', error)
      throw error
    }

    setDuplicateCheck(null)

    // Continue with remaining files if any
    if (remainingFiles.length > 0) {
      await handleMultipleUpload(remainingFiles)
    } else {
      await loadDocuments()
      setShowUploader(false)
    }
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
      setViewerDoc({ url, name: doc.name, type: doc.file_type, id: doc.id, version: doc.version })
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
    // Use subfolderParent if set (from context menu), otherwise use currentPath
    const parentPath = subfolderParent ?? currentPath
    const newFolderPath = parentPath === '/'
      ? `/${folderName}/`
      : `${parentPath}${folderName}/`

    try {
      await createFolder(projectId, {
        name: folderName,
        path: newFolderPath,
        parent_path: parentPath,
      })
      // Reload to get updated folder list
      await loadDocuments()
    } catch (error) {
      console.error('Failed to create folder:', error)
      alert(error instanceof Error ? error.message : 'Kunde inte skapa mappen')
    } finally {
      setNewFolderName('')
      setShowNewFolderModal(false)
      setSubfolderParent(null)
    }
  }

  // Handle dropping files onto a folder
  const handleDropFiles = async (folderPath: string, documentIds: string[]) => {
    if (documentIds.length === 0) return

    setIsMoving(true)
    try {
      await moveMultipleDocuments(documentIds, folderPath)
      setSelectedDocIds(new Set())
      await loadDocuments()
    } catch (error) {
      console.error('Failed to move documents:', error)
      alert(error instanceof Error ? error.message : 'Kunde inte flytta dokumenten')
    } finally {
      setIsMoving(false)
    }
  }

  // Handle creating a subfolder from context menu
  const handleCreateSubfolder = (parentPath: string) => {
    setSubfolderParent(parentPath)
    setNewFolderName('')
    setShowNewFolderModal(true)
  }

  // Handle renaming folder from context menu
  const handleRenameFolder = (path: string) => {
    // Extract folder name from path
    const parts = path.split('/').filter(Boolean)
    const name = parts[parts.length - 1] || ''
    setRenameFolderPath(path)
    setRenameFolderValue(name)
  }

  // Handle deleting folder from context menu
  const handleDeleteFolder = async (path: string) => {
    // Check if folder has documents
    const docsInFolder = allDocuments.filter(doc => doc.folder_path === path)
    if (docsInFolder.length > 0) {
      alert(`Mappen innehåller ${docsInFolder.length} fil(er). Flytta eller ta bort filerna först.`)
      return
    }

    // Check if folder has subfolders
    const hasSubfolders = folders.some(f => f !== path && f.startsWith(path))
    if (hasSubfolders) {
      alert('Mappen innehåller undermappar. Ta bort undermapparna först.')
      return
    }

    if (!confirm(`Är du säker på att du vill ta bort mappen "${path}"?`)) return

    try {
      await deleteFolder(projectId, path)
      if (currentPath === path) {
        setCurrentPath('/')
      }
      await loadDocuments()
    } catch (error) {
      console.error('Failed to delete folder:', error)
      alert(error instanceof Error ? error.message : 'Kunde inte ta bort mappen')
    }
  }

  // Handle rename submit
  const handleRenameSubmit = async () => {
    if (!renameFolderPath || !renameFolderValue.trim()) return

    try {
      await renameFolder(projectId, renameFolderPath, renameFolderValue.trim())
      // If we were in the renamed folder, update currentPath
      if (currentPath === renameFolderPath) {
        const parts = renameFolderPath.split('/').filter(Boolean)
        parts[parts.length - 1] = renameFolderValue.trim()
        setCurrentPath('/' + parts.join('/') + '/')
      }
      await loadDocuments()
    } catch (error) {
      console.error('Failed to rename folder:', error)
      alert(error instanceof Error ? error.message : 'Kunde inte byta namn på mappen')
    } finally {
      setRenameFolderPath(null)
      setRenameFolderValue('')
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
        <motion.div
          className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <motion.div
      className="h-[calc(100vh-120px)] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200 rounded-t-2xl">
        {/* Action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile folder toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="lg:hidden p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
            title={sidebarCollapsed ? 'Visa mappar' : 'Dölj mappar'}
          >
            <Folder className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 text-sm"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Ladda upp</span>
            <span className="sm:hidden">Ladda</span>
          </button>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="hidden sm:flex px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all items-center gap-2 text-sm"
          >
            <FolderPlus className="h-4 w-4" />
            Ny mapp
          </button>
          <button
            onClick={() => setShowAIWizard(true)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 text-sm"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Struktur</span>
            <span className="sm:hidden">AI</span>
          </button>
        </div>

        {/* Search and view toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök..."
              className="w-full sm:w-48 md:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* View toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button className="p-1.5 bg-white text-slate-700 rounded-lg shadow-sm" title="Listvy">
              <List className="h-4 w-4" />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg" title="Rutnät">
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload area */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 bg-white/60 backdrop-blur-sm border-b border-slate-200 overflow-hidden"
          >
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
              className="mt-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Avbryt
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content with split view */}
      <div className="flex-1 flex overflow-hidden bg-white/60 backdrop-blur-sm rounded-b-2xl border border-t-0 border-slate-200 relative">
        {/* Mobile sidebar overlay backdrop */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-30 lg:hidden"
              onClick={() => setSidebarCollapsed(true)}
            />
          )}
        </AnimatePresence>

        {/* Left sidebar - Folder tree */}
        <div
          className={`
            ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-0' : 'translate-x-0 lg:w-64'}
            fixed lg:static inset-y-0 left-0 z-40 lg:z-auto
            w-64 flex-shrink-0 bg-white lg:bg-white/80 border-r border-slate-200
            overflow-y-auto transition-all duration-200
            lg:rounded-bl-2xl
          `}
        >
          {/* Mobile sidebar header */}
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
            <span className="font-medium text-slate-900">Mappar</span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <FolderTree
            folders={folders}
            documentCounts={documentCounts}
            currentPath={currentPath}
            onSelectFolder={(path) => {
              setCurrentPath(path)
              // Auto-close sidebar on mobile after selection
              if (window.innerWidth < 1024) {
                setSidebarCollapsed(true)
              }
            }}
            onDropFiles={handleDropFiles}
            onCreateSubfolder={handleCreateSubfolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>

        {/* Sidebar toggle - desktop only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex flex-shrink-0 w-4 bg-slate-100 hover:bg-slate-200 items-center justify-center transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {/* Right side - Document list */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white/40">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-sm overflow-x-auto">
            {getBreadcrumbs().map((crumb, index, arr) => (
              <div key={crumb.path} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => setCurrentPath(crumb.path)}
                  className={`hover:text-indigo-600 transition-colors whitespace-nowrap ${
                    index === arr.length - 1 ? 'text-slate-900 font-medium' : 'text-slate-500'
                  }`}
                >
                  {crumb.name}
                </button>
                {index < arr.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                )}
              </div>
            ))}
            <span className="text-slate-400 ml-auto text-xs whitespace-nowrap flex-shrink-0">
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
              selectedIds={selectedDocIds}
              onSelectionChange={setSelectedDocIds}
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
        projectId={projectId}
        documentId={viewerDoc?.id}
        initialPage={viewerDoc?.initialPage}
        currentVersion={viewerDoc?.version || 1}
        onVersionChange={loadDocuments}
      />

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Skapa ny mapp</h2>
                <button
                  onClick={() => {
                    setShowNewFolderModal(false)
                    setNewFolderName('')
                    setSubfolderParent(null)
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mappnamn
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="t.ex. Ritningar, Kontrakt..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                  }}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Mappen skapas i: {(subfolderParent ?? currentPath) === '/' ? 'Rot' : (subfolderParent ?? currentPath)}
                </p>
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNewFolderModal(false)
                    setNewFolderName('')
                    setSubfolderParent(null)
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20"
                >
                  Skapa mapp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Folder Modal */}
      <AnimatePresence>
        {renameFolderPath && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Byt namn på mapp</h2>
                <button
                  onClick={() => {
                    setRenameFolderPath(null)
                    setRenameFolderValue('')
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nytt namn
                </label>
                <input
                  type="text"
                  value={renameFolderValue}
                  onChange={(e) => setRenameFolderValue(e.target.value)}
                  placeholder="Nytt mappnamn..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit()
                  }}
                />
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setRenameFolderPath(null)
                    setRenameFolderValue('')
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleRenameSubmit}
                  disabled={!renameFolderValue.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20"
                >
                  Byt namn
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress indicator */}
      <AnimatePresence>
        {uploadProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-80"
            >
              <div className="flex items-center gap-3 mb-3">
                <Upload className="h-5 w-5 text-indigo-600" />
                <span className="text-slate-700 font-medium">Laddar upp...</span>
              </div>
              <p className="text-sm text-slate-500 mb-2 truncate" title={uploadProgress.fileName}>
                {uploadProgress.fileName}
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">{uploadProgress.progress}%</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moving indicator */}
      <AnimatePresence>
        {isMoving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-3 shadow-2xl"
            >
              <motion.div
                className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-slate-700 font-medium">Flyttar filer...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Folder Wizard */}
      <AIFolderWizard
        isOpen={showAIWizard}
        onClose={() => setShowAIWizard(false)}
        onCreateFolders={handleCreateAIFolders}
      />

      {/* Replace Version Modal for duplicate detection */}
      {duplicateCheck && (
        <ReplaceVersionModal
          existingDocument={duplicateCheck.existingDoc}
          newFile={duplicateCheck.newFile}
          onClose={() => setDuplicateCheck(null)}
          onReplaced={handleDuplicateReplaced}
          onKeepBoth={handleKeepBoth}
        />
      )}
    </motion.div>
  )
}
