'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const upgradeProjectId = searchParams.get('upgrade')
  const isUpgrade = !!upgradeProjectId
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [projectId, setProjectId] = useState<string | null>(upgradeProjectId)

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      return
    }

    // If upgrading, we already know the project ID
    if (isUpgrade && upgradeProjectId) {
      // Still poll to confirm webhook processed
      const checkUpgrade = async () => {
        try {
          const response = await fetch(`/api/stripe/checkout/status?session_id=${sessionId}`)
          const data = await response.json()

          if (data.project_id || data.status === 'complete') {
            setStatus('success')
          } else if (data.status === 'pending') {
            setTimeout(checkUpgrade, 2000)
          } else {
            setStatus('error')
          }
        } catch {
          setTimeout(checkUpgrade, 2000)
        }
      }
      checkUpgrade()
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
  }, [sessionId, isUpgrade, upgradeProjectId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {isUpgrade ? 'Uppgraderar ditt projekt...' : 'Skapar ditt projekt...'}
          </h1>
          <p className="text-slate-400">
            {isUpgrade
              ? 'Vänligen vänta medan vi aktiverar din nya plan.'
              : 'Vänligen vänta medan vi förbereder allt åt dig.'}
          </p>
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
            {isUpgrade
              ? 'Vi kunde inte uppgradera ditt projekt. Om du har debiterats, kontakta support så hjälper vi dig.'
              : 'Vi kunde inte skapa ditt projekt. Om du har debiterats, kontakta support så hjälper vi dig.'}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href={isUpgrade && projectId ? `/dashboard/projects/${projectId}/settings` : '/projects'}
              className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              {isUpgrade ? 'Tillbaka till inställningar' : 'Tillbaka till projekt'}
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
        <h1 className="text-2xl font-bold text-white mb-2">
          {isUpgrade ? 'Projektet är uppgraderat!' : 'Projektet är skapat!'}
        </h1>
        <p className="text-slate-400 mb-8">
          {isUpgrade
            ? 'Din nya plan är nu aktiv. Du har tillgång till fler funktioner och mer lagringsutrymme.'
            : 'Ditt projekt är nu redo att användas. Du kan börja bjuda in teammedlemmar och organisera dina filer.'}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            Gå till projektet
          </Link>
          {isUpgrade ? (
            <Link
              href={`/dashboard/projects/${projectId}/settings`}
              className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Se prenumerationsdetaljer
            </Link>
          ) : (
            <Link
              href={`/dashboard/projects/${projectId}/settings/members`}
              className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Bjud in teammedlemmar
            </Link>
          )}
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
