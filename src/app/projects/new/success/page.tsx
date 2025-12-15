'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      return
    }

    // Poll for project creation (webhook might take a moment)
    const checkProject = async () => {
      try {
        const response = await fetch(`/api/stripe/checkout/status?session_id=${sessionId}`)
        const data = await response.json()

        if (data.project_id) {
          setProjectId(data.project_id)
          setStatus('success')
        } else if (data.status === 'pending') {
          // Keep polling
          setTimeout(checkProject, 2000)
        } else {
          setStatus('error')
        }
      } catch {
        // Retry a few times
        setTimeout(checkProject, 2000)
      }
    }

    checkProject()
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Skapar ditt projekt...</h1>
          <p className="text-slate-400">Vänligen vänta medan vi förbereder allt åt dig.</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Något gick fel</h1>
          <p className="text-slate-400 mb-6">
            Vi kunde inte skapa ditt projekt. Om du har debiterats, kontakta support så hjälper vi dig.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/projects"
              className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Tillbaka till projekt
            </Link>
            <a
              href="mailto:support@bloxr.se"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Kontakta support
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Projektet är skapat!</h1>
        <p className="text-slate-400 mb-8">
          Ditt projekt är nu redo att användas. Du kan börja bjuda in teammedlemmar och organisera dina filer.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            Gå till projektet
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/settings/members`}
            className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Bjud in teammedlemmar
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Laddar...</h1>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
