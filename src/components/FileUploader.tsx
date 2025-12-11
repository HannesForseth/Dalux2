'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>
  onMultipleUpload?: (files: File[]) => Promise<void>
  accept?: Record<string, string[]>
  maxSize?: number
  disabled?: boolean
  multiple?: boolean
  className?: string
}

export default function FileUploader({
  onUpload,
  onMultipleUpload,
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB default
  disabled = false,
  multiple = false,
  className = '',
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      setError(null)
      setIsUploading(true)

      try {
        if (onMultipleUpload && acceptedFiles.length > 1) {
          await onMultipleUpload(acceptedFiles)
        } else {
          for (const file of acceptedFiles) {
            await onUpload(file)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Uppladdning misslyckades')
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, onMultipleUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    disabled: disabled || isUploading,
    onDropRejected: (rejections) => {
      const rejection = rejections[0]
      if (rejection?.errors[0]?.code === 'file-too-large') {
        setError(`Filen är för stor. Max storlek är ${formatBytes(maxSize)}`)
      } else if (rejection?.errors[0]?.code === 'file-invalid-type') {
        setError('Filtypen stöds inte')
      } else {
        setError('Filen kunde inte laddas upp')
      }
    },
  })

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
          }
          ${(disabled || isUploading) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
          {isUploading ? (
            <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          )}
        </div>
        {isUploading ? (
          <p className="text-slate-400">Laddar upp...</p>
        ) : isDragActive ? (
          <p className="text-blue-400">Släpp filen här</p>
        ) : (
          <>
            <p className="text-slate-300 mb-1">
              Dra och släpp filer här, eller <span className="text-blue-400">klicka för att välja</span>
            </p>
            <p className="text-slate-500 text-sm">
              Max filstorlek: {formatBytes(maxSize)}
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
