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
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0)
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

  // Search functionality
  const performSearch = useCallback((text: string) => {
    if (!text.trim() || textContent.length === 0) {
      setSearchResults([])
      return
    }

    const searchLower = text.toLowerCase()
    const results: { page: number; count: number }[] = []

    textContent.forEach((pageText, index) => {
      const matches = (pageText.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length
      if (matches > 0) {
        results.push({ page: index + 1, count: matches })
      }
    })

    setSearchResults(results)
    setCurrentSearchIndex(0)

    // Jump to first result
    if (results.length > 0) {
      setCurrentPage(results[0].page)
    }
  }, [textContent])

  const goToNextSearchResult = () => {
    if (searchResults.length === 0) return
    const nextIndex = (currentSearchIndex + 1) % searchResults.length
    setCurrentSearchIndex(nextIndex)
    setCurrentPage(searchResults[nextIndex].page)
  }

  const goToPrevSearchResult = () => {
    if (searchResults.length === 0) return
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1
    setCurrentSearchIndex(prevIndex)
    setCurrentPage(searchResults[prevIndex].page)
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
