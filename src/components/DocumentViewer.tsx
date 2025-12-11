'use client'

import { useState, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import mammoth from 'mammoth'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  fileName: string
  fileType: string
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
  fileType
}: DocumentViewerProps) {
  const [content, setContent] = useState<ViewerContent>({ type: 'loading' })
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)

  const loadContent = useCallback(async () => {
    setContent({ type: 'loading' })
    setCurrentPage(1)

    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    const mimeType = fileType.toLowerCase()

    try {
      // PDF
      if (mimeType === 'application/pdf' || extension === 'pdf') {
        setContent({ type: 'pdf' })
        return
      }

      // Images
      if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        setContent({ type: 'image', url: fileUrl })
        return
      }

      // DOCX
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
        const response = await fetch(fileUrl)
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        setContent({ type: 'html', content: result.value })
        return
      }

      // XLSX
      if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || extension === 'xlsx' || extension === 'xls') {
        const response = await fetch(fileUrl)
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
        const response = await fetch(fileUrl)
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
        const response = await fetch(fileUrl)
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
  }, [fileUrl, fileName, fileType])

  useEffect(() => {
    if (isOpen && fileUrl) {
      loadContent()
    }
  }, [isOpen, fileUrl, loadContent])

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
    setScale(prev => Math.min(2.5, prev + 0.25))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25))
  }

  const handleDownload = () => {
    window.open(fileUrl, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl h-[90vh] mx-4 bg-slate-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <FileIcon fileType={fileType} fileName={fileName} />
            <div>
              <h2 className="text-lg font-semibold text-white truncate max-w-md">{fileName}</h2>
              <p className="text-sm text-slate-400">{getFileTypeLabel(fileType, fileName)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls for PDF */}
            {content.type === 'pdf' && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Zooma ut"
                >
                  <ZoomOutIcon />
                </button>
                <span className="text-sm text-slate-400 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Zooma in"
                >
                  <ZoomInIcon />
                </button>
                <div className="w-px h-6 bg-slate-700 mx-2" />
              </>
            )}

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <DownloadIcon />
              Ladda ner
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-800 p-4">
          {content.type === 'loading' && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {content.type === 'error' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ErrorIcon />
              <p className="mt-4 text-slate-400">{content.message}</p>
              <button
                onClick={handleDownload}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Ladda ner fil
              </button>
            </div>
          )}

          {content.type === 'unsupported' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileIcon fileType={fileType} fileName={fileName} className="h-16 w-16" />
              <p className="mt-4 text-slate-400">{content.message}</p>
              <button
                onClick={handleDownload}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Ladda ner fil
              </button>
            </div>
          )}

          {content.type === 'pdf' && (
            <div className="flex flex-col items-center">
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center h-64 text-red-400">
                    <p>Kunde inte ladda PDF-filen</p>
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg"
                />
              </Document>
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
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700">
                    {content.headers.map((header, i) => (
                      <th key={i} className="px-4 py-3 text-left font-medium text-white border-b border-slate-600">
                        {header || `Kolumn ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-700/50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2 text-slate-300 border-b border-slate-700">
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
            <pre className="p-4 bg-slate-900 rounded-lg text-slate-300 text-sm overflow-auto whitespace-pre-wrap font-mono">
              {content.content}
            </pre>
          )}
        </div>

        {/* Footer with pagination for PDF */}
        {content.type === 'pdf' && numPages > 1 && (
          <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-slate-700">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-slate-400">
              Sida {currentPage} av {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

function ErrorIcon() {
  return (
    <svg className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  )
}
