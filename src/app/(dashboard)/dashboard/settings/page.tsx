'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4 mb-8" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="space-y-4">
            <div className="h-4 bg-slate-800 rounded w-1/3" />
            <div className="h-10 bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Inställningar</h1>
        <p className="text-slate-400 mt-1">Hantera ditt konto och preferenser</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Profil</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                E-post
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Namn
              </label>
              <input
                type="text"
                value={user?.user_metadata?.full_name || ''}
                disabled
                placeholder="Inte angivet"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50"
              />
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Profilredigering kommer snart.
          </p>
        </div>

        {/* Account Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Konto</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Konto-ID</p>
                <p className="text-slate-500 text-sm font-mono">{user?.id}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Konto skapat</p>
                <p className="text-slate-500 text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('sv-SE') : 'Okänt'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Farozon</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Radera konto</p>
              <p className="text-slate-500 text-sm">
                Permanent radering av konto och all data
              </p>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Radera
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Kontoborttagning är för närvarande inaktiverat.
          </p>
        </div>
      </div>
    </div>
  )
}
