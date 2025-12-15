/**
 * Client-side direct upload to Supabase Storage
 * This bypasses the Vercel 4.5MB serverless function limit
 */

export interface DirectUploadResult {
  success: boolean
  path: string
  error?: string
}

/**
 * Upload a file directly to Supabase Storage using a signed URL
 * @param signedUrl - The signed upload URL from the server
 * @param file - The file to upload
 * @param onProgress - Optional progress callback (0-100)
 * @returns Upload result with success status and path
 */
export async function uploadFileDirectly(
  signedUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<DirectUploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })
    }

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          success: true,
          path: '' // Path is managed by server
        })
      } else {
        let errorMessage = 'Uppladdning misslyckades'
        try {
          const response = JSON.parse(xhr.responseText)
          errorMessage = response.error || response.message || errorMessage
        } catch {
          // Use default error message
        }
        resolve({
          success: false,
          path: '',
          error: errorMessage
        })
      }
    })

    // Handle errors
    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        path: '',
        error: 'Nätverksfel vid uppladdning'
      })
    })

    xhr.addEventListener('abort', () => {
      resolve({
        success: false,
        path: '',
        error: 'Uppladdning avbruten'
      })
    })

    // Open and send request
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.send(file)
  })
}

/**
 * Helper to format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
