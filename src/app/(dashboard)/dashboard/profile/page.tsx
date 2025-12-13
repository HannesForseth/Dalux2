'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, updateProfile, uploadAvatar, deleteAvatar } from '@/app/actions/profile'
import type { Profile } from '@/types/database'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Form state
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const profileData = await getProfile()
    setProfile(profileData)

    if (profileData) {
      setFullName(profileData.full_name || '')
      setCompany(profileData.company || '')
      setPhone(profileData.phone || '')
    }

    setIsLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    const result = await updateProfile({
      full_name: fullName || null,
      company: company || null,
      phone: phone || null
    })

    if (result.success) {
      setSuccessMessage('Profilen har sparats')
      setTimeout(() => setSuccessMessage(''), 3000)
      // Reload profile to get updated data
      const updatedProfile = await getProfile()
      setProfile(updatedProfile)
    } else {
      setErrorMessage(result.error || 'Ett fel uppstod')
    }

    setIsSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    setErrorMessage('')

    const formData = new FormData()
    formData.append('avatar', file)

    const result = await uploadAvatar(formData)

    if (result.success && result.url) {
      setProfile(prev => prev ? { ...prev, avatar_url: result.url! } : null)
      setSuccessMessage('Profilbild uppladdad')
      setTimeout(() => setSuccessMessage(''), 3000)
    } else {
      setErrorMessage(result.error || 'Kunde inte ladda upp bild')
    }

    setIsUploadingAvatar(false)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleDeleteAvatar() {
    if (!confirm('Vill du ta bort din profilbild?')) return

    setIsUploadingAvatar(true)
    setErrorMessage('')

    const result = await deleteAvatar()

    if (result.success) {
      setProfile(prev => prev ? { ...prev, avatar_url: null } : null)
      setSuccessMessage('Profilbild borttagen')
      setTimeout(() => setSuccessMessage(''), 3000)
    } else {
      setErrorMessage(result.error || 'Kunde inte ta bort bild')
    }

    setIsUploadingAvatar(false)
  }

  function getInitials(name: string | null | undefined, email: string | null | undefined): string {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return '?'
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4 mb-8" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 bg-slate-800 rounded-full" />
            <div className="space-y-2">
              <div className="h-6 bg-slate-800 rounded w-48" />
              <div className="h-4 bg-slate-800 rounded w-32" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-10 bg-slate-800 rounded" />
            <div className="h-10 bg-slate-800 rounded" />
            <div className="h-10 bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Min profil</h1>
        <p className="text-slate-400 mt-1">Hantera din personliga information och inställningar</p>
      </div>

      {/* Success/Error messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 flex items-center gap-2">
          <CheckCircleIcon />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
          <ExclamationCircleIcon />
          {errorMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Profilbild</h2>

          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profilbild"
                  className="w-24 h-24 rounded-full object-cover border-2 border-slate-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold border-2 border-slate-700">
                  {getInitials(profile?.full_name, user?.email)}
                </div>
              )}

              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              )}
            </div>

            {/* Upload buttons */}
            <div className="space-y-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CameraIcon />
                  {profile?.avatar_url ? 'Byt bild' : 'Ladda upp bild'}
                </label>
              </div>

              {profile?.avatar_url && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={isUploadingAvatar}
                  className="text-sm text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  Ta bort bild
                </button>
              )}

              <p className="text-xs text-slate-500">
                JPG, PNG, GIF eller WebP. Max 2 MB.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Personlig information</h2>

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-2">
                  E-postadress
                </label>
                <input
                  type="email"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-500">
                  E-postadressen kan inte ändras
                </p>
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-400 mb-2">
                  Fullständigt namn
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ange ditt namn"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-slate-400 mb-2">
                  Företag / Organisation
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ange ditt företag"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-400 mb-2">
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ange ditt telefonnummer"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner />
                    Sparar...
                  </>
                ) : (
                  'Spara ändringar'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Account Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Kontoinformation</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-sm text-slate-400">Konto-ID</p>
                <p className="text-white font-mono text-sm mt-1">{user?.id}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-sm text-slate-400">Konto skapat</p>
                <p className="text-white mt-1">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('sv-SE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Okänt'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-sm text-slate-400">Senast inloggad</p>
                <p className="text-white mt-1">
                  {user?.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('sv-SE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Okänt'}
                </p>
              </div>
            </div>

            {profile?.updated_at && (
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-400">Profil uppdaterad</p>
                  <p className="text-white mt-1">
                    {new Date(profile.updated_at).toLocaleDateString('sv-SE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Icons
function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ExclamationCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
