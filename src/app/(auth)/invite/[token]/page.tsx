'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInvitationByToken, acceptInvitation } from '@/app/actions/members'
import { createClient } from '@/lib/supabase/client'
import type { InvitationWithDetails, RoleName } from '@/types/database'
import { getRoleDisplayName } from '@/lib/permissions'

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    checkAuthAndLoadInvitation()
  }, [token])

  async function checkAuthAndLoadInvitation() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)

    try {
      const inv = await getInvitationByToken(token)
      setInvitation(inv)
    } catch (err) {
      console.error('Failed to load invitation:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAccept() {
    setIsAccepting(true)
    setError(null)

    try {
      const { projectId } = await acceptInvitation(token)
      router.push(`/dashboard/projects/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-48 mb-4" />
          <div className="h-4 bg-slate-800 rounded w-64" />
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <XCircleIcon />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Ogiltig inbjudan</h1>
          <p className="text-slate-400 mb-6">
            Denna inbjudan är ogiltig eller har gått ut. Kontakta projektadministratören för en ny inbjudan.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Gå till inloggning
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
            <EnvelopeIcon />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Projektinbjudan</h1>
          <p className="text-slate-400">
            Du har blivit inbjuden att gå med i ett projekt
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
          <div className="mb-3">
            <p className="text-sm text-slate-500">Projekt</p>
            <p className="text-white font-medium">{invitation.project?.name}</p>
          </div>
          <div className="mb-3">
            <p className="text-sm text-slate-500">Din roll</p>
            <p className="text-white">{getRoleDisplayName(invitation.role?.name as RoleName)}</p>
          </div>
          {invitation.inviter && (
            <div>
              <p className="text-sm text-slate-500">Inbjuden av</p>
              <p className="text-white">{invitation.inviter.full_name || 'Okänd'}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {isLoggedIn ? (
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAccepting ? 'Accepterar...' : 'Acceptera inbjudan'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm text-center">
              Du måste vara inloggad för att acceptera inbjudan
            </p>
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
            >
              Logga in
            </Link>
            <Link
              href={`/register?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`}
              className="block w-full px-4 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors text-center"
            >
              Skapa konto
            </Link>
          </div>
        )}

        <p className="text-center text-slate-500 text-sm mt-6">
          Inbjudan går ut {new Date(invitation.expires_at).toLocaleDateString('sv-SE')}
        </p>
      </div>
    </div>
  )
}

function XCircleIcon() {
  return (
    <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}
