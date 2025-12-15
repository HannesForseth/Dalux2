'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import mammoth from 'mammoth'
import CommentPanel from './documents/CommentPanel'
import VersionHistoryPanel from './documents/VersionHistoryPanel'
import UploadVersionModal from './documents/UploadVersionModal'
import { getComparisonUrls, getDocumentDownloadUrl } from '@/app/actions/documents'
import { getDocumentHighlights, createHighlight, updateHighlight, deleteHighlight } from '@/app/actions/documentHighlights'
import type { DocumentHighlightWithCreator, HighlightColor, CreateHighlightData } from '@/types/database'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  fileName: string
  fileType: string
  projectId?: string
  documentId?: string
  initialPage?: number
  currentVersion?: number
  onVersionChange?: () => void
}

type ViewerContent =
  | { type: 'pdf' }
  | { type: 'image'; url: string }
  | { type: 'html'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'text'; content: string }
  | { type: 'unsupported'; message: string }
  | { type: 'loading' }
  | { type: 'error'; message: string }

// Enhanced search result with context
interface DetailedSearchResult {
  page: number
  text: string
  contextBefore: string
  contextAfter: string
  index: number
  offset: number
}

// Highlight colors configuration
const HIGHLIGHT_COLORS: { id: HighlightColor; bg: string; text: string; name: string }[] = [
  { id: 'yellow', bg: 'bg-yellow-300', text: 'text-yellow-800', name: 'Gul' },
  { id: 'green', bg: 'bg-green-300', text: 'text-green-800', name: 'Grön' },
  { id: 'blue', bg: 'bg-blue-300', text: 'text-blue-800', name: 'Blå' },
  { id: 'pink', bg: 'bg-pink-300', text: 'text-pink-800', name: 'Rosa' },
  { id: 'orange', bg: 'bg-orange-300', text: 'text-orange-800', name: 'Orange' },
]

export default function DocumentViewer({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
  projectId,
  documentId,
  initialPage,
  currentVersion = 1,
  onVersionChange
}: DocumentViewerProps) {
  const [content, setContent] = useState<ViewerContent>({ type: 'loading' })
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [searchText, setSearchText] = useState<string>('')
  const [searchOpen, setSearchOpen] = useState<boolean>(false)
  const [textContent, setTextContent] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<{ page: number; count: number }[]>([])
  const [detailedSearchResults, setDetailedSearchResults] = useState<DetailedSearchResult[]>([])
  const [showSearchResultsPanel, setShowSearchResultsPanel] = useState<boolean>(false)
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0)

  // Highlight state
  const [highlights, setHighlights] = useState<DocumentHighlightWithCreator[]>([])
  const [highlightMode, setHighlightMode] = useState<boolean>(false)
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<HighlightColor>('yellow')
  const [showHighlightsPanel, setShowHighlightsPanel] = useState<boolean>(false)
  const [showAddHighlightModal, setShowAddHighlightModal] = useState<boolean>(false)
  const [pendingHighlight, setPendingHighlight] = useState<{
    text: string
    page: number
    startOffset: number
    endOffset: number
  } | null>(null)
  const [highlightNote, setHighlightNote] = useState<string>('')
  const [editingHighlight, setEditingHighlight] = useState<DocumentHighlightWithCreator | null>(null)
  const [commentsOpen, setCommentsOpen] = useState<boolean>(false)
  const [versionsOpen, setVersionsOpen] = useState<boolean>(false)
  const [uploadVersionOpen, setUploadVersionOpen] = useState<boolean>(false)
  const [viewingOldVersion, setViewingOldVersion] = useState<{ url: string; version: number } | null>(null)
  const [compareMode, setCompareMode] = useState<{ url1: string; url2: string; v1: number; v2: number } | null>(null)
  const [actualFileUrl, setActualFileUrl] = useState<string>(fileUrl)

  // Pan/drag state
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 })

  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Reset viewing state when document changes
  useEffect(() => {
    setActualFileUrl(fileUrl)
    setViewingOldVersion(null)
    setCompareMode(null)
  }, [fileUrl, documentId])

  // Load highlights when document opens
  useEffect(() => {
    const loadHighlights = async () => {
      if (!isOpen || !documentId) return
      try {
        const data = await getDocumentHighlights(documentId)
        setHighlights(data)
      } catch (error) {
        console.error('Error loading highlights:', error)
      }
    }
    loadHighlights()
  }, [isOpen, documentId])

  const loadContent = useCallback(async () => {
    setContent({ type: 'loading' })
    setCurrentPage(initialPage || 1)

    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    const mimeType = fileType.toLowerCase()
    const urlToLoad = viewingOldVersion?.url || actualFileUrl

    try {
      // PDF
      if (mimeType === 'application/pdf' || extension === 'pdf') {
        setContent({ type: 'pdf' })
        return
      }

      // Images
      if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        setContent({ type: 'image', url: urlToLoad })
        return
      }

      // DOCX
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
        const response = await fetch(urlToLoad)
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        setContent({ type: 'html', content: result.value })
        return
      }

      // XLSX
      if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || extension === 'xlsx' || extension === 'xls') {
        const response = await fetch(urlToLoad)
        const arrayBuffer = await response.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })

        if (jsonData.length > 0) {
          const headers = (jsonData[0] as string[]).map(h => String(h || ''))
          const rows = jsonData.slice(1).map(row =>
            (row as string[]).map(cell => String(cell || ''))
          )
          setContent({ type: 'table', headers, rows })
        } else {
          setContent({ type: 'text', content: 'Tom fil' })
        }
        return
      }

      // CSV
      if (mimeType === 'text/csv' || extension === 'csv') {
        const response = await fetch(urlToLoad)
        const text = await response.text()
        const result = Papa.parse<string[]>(text)

        if (result.data.length > 0) {
          const headers = result.data[0].map(h => String(h || ''))
          const rows = result.data.slice(1).filter(row => row.some(cell => cell)).map(row =>
            row.map(cell => String(cell || ''))
          )
          setContent({ type: 'table', headers, rows })
        } else {
          setContent({ type: 'text', content: 'Tom fil' })
        }
        return
      }

      // PPTX - Show message (complex to render, suggest download)
      if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || extension === 'pptx') {
        setContent({
          type: 'unsupported',
          message: 'PowerPoint-filer kan inte visas direkt. Ladda ner filen för att öppna den.'
        })
        return
      }

      // Plain text files
      if (mimeType.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(extension)) {
        const response = await fetch(urlToLoad)
        const text = await response.text()
        setContent({ type: 'text', content: text })
        return
      }

      // Default - unsupported
      setContent({
        type: 'unsupported',
        message: `Filtypen "${extension}" kan inte visas. Ladda ner filen för att öppna den.`
      })

    } catch (error) {
      console.error('Error loading document:', error)
      setContent({
        type: 'error',
        message: 'Kunde inte ladda dokumentet. Försök ladda ner det istället.'
      })
    }
  }, [actualFileUrl, viewingOldVersion, fileName, fileType, initialPage])

  useEffect(() => {
    if (isOpen && (actualFileUrl || viewingOldVersion)) {
      loadContent()
    }
  }, [isOpen, actualFileUrl, viewingOldVersion, loadContent])

  // Handler for viewing old versions
  const handleViewOldVersion = (url: string, version: number) => {
    setViewingOldVersion({ url, version })
    setCompareMode(null)
  }

  // Handler for returning to current version
  const handleReturnToCurrent = async () => {
    setViewingOldVersion(null)
    setCompareMode(null)
    if (documentId) {
      try {
        const url = await getDocumentDownloadUrl(documentId)
        setActualFileUrl(url)
      } catch (error) {
        console.error('Error getting current version URL:', error)
      }
    }
  }

  // Handler for comparing versions
  const handleCompareVersions = async (v1: number, v2: number) => {
    if (!documentId) return
    try {
      const { url1, url2 } = await getComparisonUrls(documentId, v1, v2)
      setCompareMode({ url1, url2, v1, v2 })
      setViewingOldVersion(null)
    } catch (error) {
      console.error('Error getting comparison URLs:', error)
    }
  }

  // Handler for version uploaded
  const handleVersionUploaded = () => {
    onVersionChange?.()
    setViewingOldVersion(null)
    setCompareMode(null)
  }

  // Determine if this is a PDF
  const isPdf = fileType.toLowerCase() === 'application/pdf' || fileName.split('.').pop()?.toLowerCase() === 'pdf'

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(numPages, prev + 1))
  }

  const handleZoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.25))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.25, prev - 0.25))
  }

  const handleZoomReset = () => {
    setScale(1.0)
    setPanOffset({ x: 0, y: 0 })
    setLastPanOffset({ x: 0, y: 0 })
  }

  const handleDownload = () => {
    window.open(fileUrl, '_blank')
  }

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 || content.type !== 'pdf') return
    e.preventDefault()
    setIsPanning(true)
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    const newOffset = {
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    }
    setPanOffset(newOffset)
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      setLastPanOffset(panOffset)
    }
  }

  const handleMouseLeave = () => {
    if (isPanning) {
      setIsPanning(false)
      setLastPanOffset(panOffset)
    }
  }

  // Handle mouse wheel events for zoom and page navigation
  const handleWheel = useCallback((e: WheelEvent) => {
    if (content.type !== 'pdf') return

    // Ctrl + wheel = page navigation
    if (e.ctrlKey) {
      e.preventDefault()
      if (e.deltaY > 0) {
        // Scroll down = next page
        setCurrentPage(prev => Math.min(numPages, prev + 1))
      } else {
        // Scroll up = previous page
        setCurrentPage(prev => Math.max(1, prev - 1))
      }
    } else {
      // Regular wheel = zoom at cursor position
      const target = e.target as HTMLElement
      const pdfContainer = pdfContainerRef.current
      if (pdfContainer && pdfContainer.contains(target)) {
        e.preventDefault()
        const zoomStep = 0.1
        const rect = pdfContainer.getBoundingClientRect()

        // Calculate cursor position relative to container center
        const cursorX = e.clientX - rect.left - rect.width / 2
        const cursorY = e.clientY - rect.top - rect.height / 2

        setScale(prev => {
          const newScale = e.deltaY < 0
            ? Math.min(3.0, prev + zoomStep)
            : Math.max(0.25, prev - zoomStep)

          // Calculate new pan offset to zoom towards cursor
          const scaleFactor = newScale / prev
          const newPanX = lastPanOffset.x - cursorX * (scaleFactor - 1)
          const newPanY = lastPanOffset.y - cursorY * (scaleFactor - 1)

          setPanOffset({ x: newPanX, y: newPanY })
          setLastPanOffset({ x: newPanX, y: newPanY })

          return newScale
        })
      }
    }
  }, [content.type, numPages, lastPanOffset])

  // Add wheel event listener
  useEffect(() => {
    const container = pdfContainerRef.current
    if (container && content.type === 'pdf') {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel, content.type])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      // Ctrl+F to open search
      if (e.ctrlKey && e.key === 'f' && content.type === 'pdf') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }

      // Escape to close search or modal
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false)
          setSearchText('')
        } else {
          onClose()
        }
      }

      // Arrow keys for page navigation in PDF
      if (content.type === 'pdf' && !searchOpen) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setCurrentPage(prev => Math.min(numPages, prev + 1))
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          setCurrentPage(prev => Math.max(1, prev - 1))
        }
      }

      // Zoom keyboard shortcuts
      if (content.type === 'pdf' && !searchOpen) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault()
          setScale(prev => Math.min(3.0, prev + 0.25))
        } else if (e.key === '-') {
          e.preventDefault()
          setScale(prev => Math.max(0.25, prev - 0.25))
        } else if (e.key === '0') {
          e.preventDefault()
          handleZoomReset()
        }
      }

      // Enter in search to go to next result
      if (searchOpen && e.key === 'Enter') {
        if (e.shiftKey) {
          goToPrevSearchResult()
        } else {
          goToNextSearchResult()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, content.type, numPages, searchOpen, onClose])

  // Search functionality with detailed results
  const performSearch = useCallback((text: string) => {
    if (!text.trim() || textContent.length === 0) {
      setSearchResults([])
      setDetailedSearchResults([])
      setShowSearchResultsPanel(false)
      return
    }

    const searchLower = text.toLowerCase()
    const results: { page: number; count: number }[] = []
    const detailed: DetailedSearchResult[] = []
    let globalIndex = 0

    textContent.forEach((pageText, pageIndex) => {
      const pageLower = pageText.toLowerCase()
      let searchIndex = 0
      let matchCount = 0

      // Find all occurrences in this page
      while (true) {
        const foundAt = pageLower.indexOf(searchLower, searchIndex)
        if (foundAt === -1) break

        matchCount++

        // Extract context (30 chars before and after)
        const contextStart = Math.max(0, foundAt - 30)
        const contextEnd = Math.min(pageText.length, foundAt + text.length + 30)
        const contextBefore = pageText.slice(contextStart, foundAt)
        const contextAfter = pageText.slice(foundAt + text.length, contextEnd)
        const matchedText = pageText.slice(foundAt, foundAt + text.length)

        detailed.push({
          page: pageIndex + 1,
          text: matchedText,
          contextBefore: (contextStart > 0 ? '...' : '') + contextBefore,
          contextAfter: contextAfter + (contextEnd < pageText.length ? '...' : ''),
          index: globalIndex,
          offset: foundAt
        })

        globalIndex++
        searchIndex = foundAt + text.length
      }

      if (matchCount > 0) {
        results.push({ page: pageIndex + 1, count: matchCount })
      }
    })

    setSearchResults(results)
    setDetailedSearchResults(detailed)
    setCurrentSearchIndex(0)

    // Show search results panel if we have results
    if (detailed.length > 0) {
      setShowSearchResultsPanel(true)
      setCurrentPage(detailed[0].page)
    }
  }, [textContent])

  const goToNextSearchResult = () => {
    if (detailedSearchResults.length === 0) return
    const nextIndex = (currentSearchIndex + 1) % detailedSearchResults.length
    setCurrentSearchIndex(nextIndex)
    setCurrentPage(detailedSearchResults[nextIndex].page)
  }

  const goToPrevSearchResult = () => {
    if (detailedSearchResults.length === 0) return
    const prevIndex = currentSearchIndex === 0 ? detailedSearchResults.length - 1 : currentSearchIndex - 1
    setCurrentSearchIndex(prevIndex)
    setCurrentPage(detailedSearchResults[prevIndex].page)
  }

  const goToSearchResult = (index: number) => {
    if (index < 0 || index >= detailedSearchResults.length) return
    setCurrentSearchIndex(index)
    setCurrentPage(detailedSearchResults[index].page)
  }

  // Highlight handlers
  const handleTextSelection = useCallback(() => {
    if (!highlightMode || content.type !== 'pdf') return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text = selection.toString().trim()
    if (!text || text.length < 2) return

    // Find the page number from the selection
    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    const pageElement = container instanceof Element
      ? container.closest('.react-pdf__Page')
      : container.parentElement?.closest('.react-pdf__Page')

    if (!pageElement) return

    // Get text offset (simplified - in real implementation would need more precise calculation)
    const startOffset = 0
    const endOffset = text.length

    setPendingHighlight({
      text,
      page: currentPage,
      startOffset,
      endOffset
    })
    setHighlightNote('')
    setShowAddHighlightModal(true)
    selection.removeAllRanges()
  }, [highlightMode, content.type, currentPage])

  // Add mouseup event listener for text selection in highlight mode
  useEffect(() => {
    if (!highlightMode || content.type !== 'pdf') return

    const container = pdfContainerRef.current
    if (!container) return

    const handleMouseUpForSelection = () => {
      // Small delay to ensure selection is complete
      setTimeout(handleTextSelection, 10)
    }

    container.addEventListener('mouseup', handleMouseUpForSelection)
    return () => container.removeEventListener('mouseup', handleMouseUpForSelection)
  }, [highlightMode, content.type, handleTextSelection])

  const handleSaveHighlight = async () => {
    if (!pendingHighlight || !documentId || !projectId) return

    try {
      const data: CreateHighlightData = {
        page_number: pendingHighlight.page,
        start_offset: pendingHighlight.startOffset,
        end_offset: pendingHighlight.endOffset,
        selected_text: pendingHighlight.text,
        color: selectedHighlightColor,
        note: highlightNote || undefined
      }

      await createHighlight(documentId, projectId, data)

      // Reload highlights
      const updatedHighlights = await getDocumentHighlights(documentId)
      setHighlights(updatedHighlights)

      setShowAddHighlightModal(false)
      setPendingHighlight(null)
      setHighlightNote('')
    } catch (error) {
      console.error('Error saving highlight:', error)
    }
  }

  const handleUpdateHighlight = async (highlightId: string, newColor?: HighlightColor, newNote?: string) => {
    try {
      await updateHighlight(highlightId, { color: newColor, note: newNote })

      // Reload highlights
      if (documentId) {
        const updatedHighlights = await getDocumentHighlights(documentId)
        setHighlights(updatedHighlights)
      }
      setEditingHighlight(null)
    } catch (error) {
      console.error('Error updating highlight:', error)
    }
  }

  const handleDeleteHighlight = async (highlightId: string) => {
    try {
      await deleteHighlight(highlightId)

      // Reload highlights
      if (documentId) {
        const updatedHighlights = await getDocumentHighlights(documentId)
        setHighlights(updatedHighlights)
      }
    } catch (error) {
      console.error('Error deleting highlight:', error)
    }
  }

  const handleGoToHighlight = (highlight: DocumentHighlightWithCreator) => {
    setCurrentPage(highlight.page_number)
  }

  // Extract text content from PDF for search
  const onDocumentLoadSuccessWithText = async ({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages)

    // Load text content for all pages for search
    try {
      const pdf = await pdfjs.getDocument(fileUrl).promise
      const texts: string[] = []

      for (let i = 1; i <= pages; i++) {
        const page = await pdf.getPage(i)
        const textContentData = await page.getTextContent()
        const pageText = textContentData.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
        texts.push(pageText)
      }

      setTextContent(texts)
    } catch (error) {
      console.error('Error extracting PDF text:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-7xl h-[95vh] mx-2 bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <FileIcon fileType={fileType} fileName={fileName} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900 truncate max-w-md">{fileName}</h2>
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                  v{viewingOldVersion?.version || currentVersion}
                </span>
              </div>
              <p className="text-sm text-slate-500">{getFileTypeLabel(fileType, fileName)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search bar for PDF */}
            {content.type === 'pdf' && searchOpen && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 mr-2 shadow-sm">
                <SearchIcon className="h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value)
                    performSearch(e.target.value)
                  }}
                  placeholder="Sök i PDF..."
                  className="bg-transparent text-slate-900 text-sm w-40 outline-none placeholder-slate-400"
                />
                {searchResults.length > 0 && (
                  <span className="text-xs text-slate-500">
                    {currentSearchIndex + 1}/{searchResults.length}
                  </span>
                )}
                <button
                  onClick={goToPrevSearchResult}
                  disabled={searchResults.length === 0}
                  className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-50"
                  title="Föregående (Shift+Enter)"
                >
                  <ChevronUpIcon />
                </button>
                <button
                  onClick={goToNextSearchResult}
                  disabled={searchResults.length === 0}
                  className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-50"
                  title="Nästa (Enter)"
                >
                  <ChevronDownIcon />
                </button>
                <button
                  onClick={() => {
                    setSearchOpen(false)
                    setSearchText('')
                    setSearchResults([])
                  }}
                  className="p-1 text-slate-400 hover:text-slate-900"
                >
                  <CloseIcon />
                </button>
              </div>
            )}

            {/* Search button for PDF */}
            {content.type === 'pdf' && !searchOpen && (
              <button
                onClick={() => {
                  setSearchOpen(true)
                  setTimeout(() => searchInputRef.current?.focus(), 100)
                }}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sök (Ctrl+F)"
              >
                <SearchIcon />
              </button>
            )}

            {/* Highlight mode toggle for PDF */}
            {content.type === 'pdf' && projectId && documentId && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setHighlightMode(!highlightMode)}
                  className={`p-2 rounded-lg transition-colors ${highlightMode ? 'text-yellow-600 bg-yellow-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  title={highlightMode ? 'Avsluta markeringsläge' : 'Markera text'}
                >
                  <HighlighterIcon />
                </button>
                {highlightMode && (
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedHighlightColor(color.id)}
                        className={`w-6 h-6 rounded ${color.bg} ${selectedHighlightColor === color.id ? 'ring-2 ring-slate-600 ring-offset-1' : ''}`}
                        title={color.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Highlights panel toggle */}
            {content.type === 'pdf' && projectId && documentId && (
              <button
                onClick={() => setShowHighlightsPanel(!showHighlightsPanel)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${showHighlightsPanel ? 'text-yellow-600 bg-yellow-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                title="Visa markeringar"
              >
                <ListBulletIcon />
                {highlights.length > 0 && (
                  <span className="text-xs font-medium">{highlights.length}</span>
                )}
              </button>
            )}

            {/* Comments button for PDF */}
            {content.type === 'pdf' && projectId && documentId && (
              <button
                onClick={() => setCommentsOpen(!commentsOpen)}
                className={`p-2 rounded-lg transition-colors ${commentsOpen ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                title="Kommentarer"
              >
                <CommentIcon />
              </button>
            )}

            {/* Version history button */}
            {documentId && (
              <button
                onClick={() => setVersionsOpen(!versionsOpen)}
                className={`p-2 rounded-lg transition-colors ${versionsOpen ? 'text-amber-600 bg-amber-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                title="Versionshistorik"
              >
                <ClockIcon />
              </button>
            )}

            {/* Upload new version button */}
            {documentId && !viewingOldVersion && !compareMode && (
              <button
                onClick={() => setUploadVersionOpen(true)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Ladda upp ny version"
              >
                <ArrowUpTrayIcon />
              </button>
            )}

            {/* Divider */}
            {content.type === 'pdf' && <div className="w-px h-6 bg-slate-200 mx-1" />}

            {/* Zoom controls for PDF */}
            {content.type === 'pdf' && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition-colors"
                  title="Zooma ut (-)"
                >
                  <ZoomOutIcon />
                </button>
                <span className="text-sm text-slate-600 min-w-[50px] text-center font-medium">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition-colors"
                  title="Zooma in (+)"
                >
                  <ZoomInIcon />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition-colors"
                  title="Återställ zoom (0)"
                >
                  <ResetIcon />
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-sm"
            >
              <DownloadIcon />
              Ladda ner
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content area with optional comments panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 p-2">
            {content.type === 'loading' && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
          )}

          {content.type === 'error' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ErrorIcon />
              <p className="mt-4 text-slate-500">{content.message}</p>
              <button
                onClick={handleDownload}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                Ladda ner fil
              </button>
            </div>
          )}

          {content.type === 'unsupported' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileIcon fileType={fileType} fileName={fileName} className="h-16 w-16" />
              <p className="mt-4 text-slate-500">{content.message}</p>
              <button
                onClick={handleDownload}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                Ladda ner fil
              </button>
            </div>
          )}

          {content.type === 'pdf' && !compareMode && (
            <div
              ref={pdfContainerRef}
              className={`flex flex-col items-center min-h-full select-none ${scale > 1 ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {/* Old version banner */}
              {viewingOldVersion && (
                <div className="mb-4 w-full max-w-2xl p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-amber-600" />
                    <span className="text-amber-800">
                      Visar version {viewingOldVersion.version} av {currentVersion}
                    </span>
                  </div>
                  <button
                    onClick={handleReturnToCurrent}
                    className="px-3 py-1 text-sm bg-amber-500 hover:bg-amber-400 text-white rounded transition-colors"
                  >
                    Tillbaka till aktuell
                  </button>
                </div>
              )}

              <div
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                }}
              >
                <Document
                  file={viewingOldVersion?.url || actualFileUrl}
                  onLoadSuccess={onDocumentLoadSuccessWithText}
                  loading={
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center h-64 text-red-500">
                      <p>Kunde inte ladda PDF-filen</p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    className="shadow-xl rounded-lg"
                  />
                </Document>
              </div>

              {/* Zoom hint tooltip */}
              <div className="mt-4 text-xs text-slate-400 text-center space-x-3">
                <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">Scroll</kbd> zooma</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">+/-</kbd> zooma</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">0</kbd> återställ</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">Ctrl+F</kbd> sök</span>
                {scale > 1 && <span className="text-indigo-500 font-medium">Dra för att panorera</span>}
              </div>
            </div>
          )}

          {/* PDF Comparison Mode - Side by Side */}
          {content.type === 'pdf' && compareMode && (
            <div className="flex flex-col h-full">
              {/* Comparison header */}
              <div className="flex items-center justify-between p-3 bg-purple-50 border-b border-purple-200">
                <div className="flex items-center gap-2">
                  <DocumentDuplicateIcon className="h-5 w-5 text-purple-600" />
                  <span className="text-purple-800">
                    Jämför version {compareMode.v1} med version {compareMode.v2}
                  </span>
                </div>
                <button
                  onClick={() => setCompareMode(null)}
                  className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                >
                  Stäng jämförelse
                </button>
              </div>

              {/* Side by side PDFs */}
              <div className="flex-1 flex gap-2 p-2 overflow-hidden">
                {/* Left PDF - Version 1 */}
                <div className="flex-1 flex flex-col bg-white rounded-lg overflow-hidden border border-slate-200">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-700">Version {compareMode.v1}</span>
                  </div>
                  <div className="flex-1 overflow-auto p-2 bg-slate-100">
                    <Document
                      file={compareMode.url1}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <div className="flex items-center justify-center h-64">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                      }
                    >
                      <Page
                        pageNumber={currentPage}
                        scale={scale * 0.85}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-lg mx-auto"
                      />
                    </Document>
                  </div>
                </div>

                {/* Right PDF - Version 2 */}
                <div className="flex-1 flex flex-col bg-white rounded-lg overflow-hidden border border-slate-200">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-700">Version {compareMode.v2}</span>
                  </div>
                  <div className="flex-1 overflow-auto p-2 bg-slate-100">
                    <Document
                      file={compareMode.url2}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <div className="flex items-center justify-center h-64">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                      }
                    >
                      <Page
                        pageNumber={currentPage}
                        scale={scale * 0.85}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-lg mx-auto"
                      />
                    </Document>
                  </div>
                </div>
              </div>
            </div>
          )}

          {content.type === 'image' && (
            <div className="flex items-center justify-center h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.url}
                alt={fileName}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
          )}

          {content.type === 'html' && (
            <div
              className="prose prose-invert max-w-none p-6 bg-white rounded-lg"
              dangerouslySetInnerHTML={{ __html: content.content }}
            />
          )}

          {content.type === 'table' && (
            <div className="overflow-auto bg-white rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {content.headers.map((header, i) => (
                      <th key={i} className="px-4 py-3 text-left font-medium text-slate-700 border-b border-slate-200">
                        {header || `Kolumn ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2 text-slate-600 border-b border-slate-100">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {content.type === 'text' && (
            <pre className="p-4 bg-white rounded-lg border border-slate-200 text-slate-700 text-sm overflow-auto whitespace-pre-wrap font-mono shadow-sm">
              {content.content}
            </pre>
          )}
          </div>

          {/* Comments Panel */}
          {commentsOpen && projectId && documentId && (
            <CommentPanel
              documentId={documentId}
              projectId={projectId}
              currentPage={currentPage}
              onClose={() => setCommentsOpen(false)}
            />
          )}

          {/* Search Results Panel */}
          {showSearchResultsPanel && detailedSearchResults.length > 0 && (
            <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h3 className="font-medium text-slate-900">
                  Sökresultat ({detailedSearchResults.length})
                </h3>
                <button
                  onClick={() => setShowSearchResultsPanel(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 rounded transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {detailedSearchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => goToSearchResult(index)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      currentSearchIndex === index ? 'bg-yellow-50 border-l-2 border-l-yellow-400' : ''
                    }`}
                  >
                    <div className="text-sm text-slate-600 mb-1">
                      <span className="text-slate-400">{result.contextBefore}</span>
                      <mark className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium">
                        {result.text}
                      </mark>
                      <span className="text-slate-400">{result.contextAfter}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Sida {result.page}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Highlights Panel */}
          {showHighlightsPanel && projectId && documentId && (
            <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h3 className="font-medium text-slate-900">
                  Markeringar ({highlights.length})
                </h3>
                <button
                  onClick={() => setShowHighlightsPanel(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 rounded transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {highlights.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    <HighlighterIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>Inga markeringar ännu</p>
                    <p className="text-xs mt-1">Aktivera markeringsläge och markera text i dokumentet</p>
                  </div>
                ) : (
                  highlights.map((highlight) => {
                    const colorConfig = HIGHLIGHT_COLORS.find(c => c.id === highlight.color) || HIGHLIGHT_COLORS[0]
                    return (
                      <div
                        key={highlight.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <button
                          onClick={() => handleGoToHighlight(highlight)}
                          className="w-full text-left px-4 py-3"
                        >
                          <div className="flex items-start gap-2">
                            <span className={`w-3 h-3 rounded-full ${colorConfig.bg} flex-shrink-0 mt-1`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 line-clamp-2">
                                &ldquo;{highlight.selected_text}&rdquo;
                              </p>
                              {highlight.note && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {highlight.note}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                Sida {highlight.page_number} &middot; {highlight.creator?.full_name || 'Okänd'}
                              </p>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 px-4 pb-2">
                          {HIGHLIGHT_COLORS.map((color) => (
                            <button
                              key={color.id}
                              onClick={() => handleUpdateHighlight(highlight.id, color.id)}
                              className={`w-5 h-5 rounded ${color.bg} ${highlight.color === color.id ? 'ring-1 ring-slate-600' : 'opacity-50 hover:opacity-100'}`}
                              title={color.name}
                            />
                          ))}
                          <button
                            onClick={() => handleDeleteHighlight(highlight.id)}
                            className="ml-auto p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Ta bort"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Version History Panel */}
          {versionsOpen && documentId && (
            <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h3 className="font-medium text-slate-900">Versioner</h3>
                <button
                  onClick={() => setVersionsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 rounded transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <VersionHistoryPanel
                  documentId={documentId}
                  documentName={fileName}
                  currentVersion={currentVersion}
                  onViewVersion={handleViewOldVersion}
                  onCompareVersions={handleCompareVersions}
                  onVersionRestored={handleVersionUploaded}
                  isPdf={isPdf}
                />
              </div>
            </div>
          )}
        </div>

        {/* Upload Version Modal */}
        {uploadVersionOpen && documentId && (
          <UploadVersionModal
            documentId={documentId}
            documentName={fileName}
            currentVersion={currentVersion}
            onClose={() => setUploadVersionOpen(false)}
            onSuccess={handleVersionUploaded}
          />
        )}

        {/* Add Highlight Modal */}
        {showAddHighlightModal && pendingHighlight && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setShowAddHighlightModal(false)
                setPendingHighlight(null)
              }}
            />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Spara markering</h3>

              {/* Selected text preview */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Markerad text:</p>
                <p className="text-sm text-slate-700 line-clamp-3">&ldquo;{pendingHighlight.text}&rdquo;</p>
                <p className="text-xs text-slate-400 mt-2">Sida {pendingHighlight.page}</p>
              </div>

              {/* Color picker */}
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-2">Färg:</p>
                <div className="flex gap-2">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedHighlightColor(color.id)}
                      className={`w-8 h-8 rounded-lg ${color.bg} ${
                        selectedHighlightColor === color.id
                          ? 'ring-2 ring-slate-600 ring-offset-2'
                          : 'hover:scale-110'
                      } transition-transform`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Note input */}
              <div className="mb-6">
                <label className="block text-sm text-slate-500 mb-2">Anteckning (valfritt):</label>
                <textarea
                  value={highlightNote}
                  onChange={(e) => setHighlightNote(e.target.value)}
                  placeholder="Skriv en anteckning..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddHighlightModal(false)
                    setPendingHighlight(null)
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleSaveHighlight}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Spara markering
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer with pagination for PDF */}
        {content.type === 'pdf' && numPages > 1 && (
          <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-slate-200 bg-white/50">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-slate-600 font-medium">
              Sida {currentPage} av {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to get file type label
function getFileTypeLabel(mimeType: string, fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  const labels: Record<string, string> = {
    'pdf': 'PDF-dokument',
    'docx': 'Word-dokument',
    'doc': 'Word-dokument',
    'xlsx': 'Excel-kalkylblad',
    'xls': 'Excel-kalkylblad',
    'csv': 'CSV-fil',
    'pptx': 'PowerPoint-presentation',
    'ppt': 'PowerPoint-presentation',
    'jpg': 'JPEG-bild',
    'jpeg': 'JPEG-bild',
    'png': 'PNG-bild',
    'gif': 'GIF-bild',
    'webp': 'WebP-bild',
    'svg': 'SVG-bild',
    'txt': 'Textfil',
    'md': 'Markdown-fil',
    'json': 'JSON-fil',
    'xml': 'XML-fil',
  }

  return labels[extension] || mimeType || 'Fil'
}

// Icons
function FileIcon({ fileType, fileName, className = 'h-8 w-8' }: { fileType: string; fileName: string; className?: string }) {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  // Color based on file type
  let color = 'text-slate-400'
  if (['pdf'].includes(extension)) color = 'text-red-400'
  else if (['docx', 'doc'].includes(extension)) color = 'text-blue-400'
  else if (['xlsx', 'xls', 'csv'].includes(extension)) color = 'text-green-400'
  else if (['pptx', 'ppt'].includes(extension)) color = 'text-orange-400'
  else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) color = 'text-purple-400'

  return (
    <svg className={`${className} ${color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function ZoomInIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
    </svg>
  )
}

function ZoomOutIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  )
}

function ClockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ArrowUpTrayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function DocumentDuplicateIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  )
}

function HighlighterIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function ListBulletIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}
