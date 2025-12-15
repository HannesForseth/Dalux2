'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, Building2, Phone, Mail, Calendar, Clock, Save, Camera, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, updateProfile, uploadAvatar, deleteAvatar } from '@/app/actions/profile'
import type { Profile } from '@/types/database'
import type { User as AuthUser } from '@supabase/supabase-js'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
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
      <div className="animate-pulse max-w-3xl mx-auto space-y-6">
        <div className="h-8 bg-slate-200 rounded-xl w-1/3" />
        <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 h-40" />
        <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 h-64" />
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Min profil</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1">Hantera din personliga information</p>
      </motion.div>

      {/* Success/Error messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </motion.div>
      )}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {errorMessage}
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Avatar Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Profilbild</h2>
              <p className="text-sm text-slate-500">Din avatar som visas i systemet</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profilbild"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl font-semibold border-2 border-slate-200 shadow-sm">
                  {getInitials(profile?.full_name, user?.email)}
                </div>
              )}

              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                  <motion.div
                    className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              )}
            </div>

            {/* Upload buttons */}
            <div className="space-y-3 text-center sm:text-left w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row items-center gap-2">
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors cursor-pointer text-sm sm:text-base"
                >
                  <Camera className="w-4 h-4" />
                  {profile?.avatar_url ? 'Byt bild' : 'Ladda upp bild'}
                </label>

                {profile?.avatar_url && (
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={isUploadingAvatar}
                    className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50 px-3 py-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Ta bort
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                JPG, PNG, GIF eller WebP. Max 2 MB.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Profile Form */}
        <motion.div variants={itemVariants}>
          <form onSubmit={handleSave}>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Personlig information</h2>
                  <p className="text-sm text-slate-500">Uppdatera din profilinformation</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    E-postadress
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    E-postadressen kan inte ändras
                  </p>
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
                    Fullständigt namn
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ange ditt namn"
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">
                    Företag / Organisation
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Ange ditt företag"
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                    Telefonnummer
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ange ditt telefonnummer"
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Sparar...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Spara ändringar
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>

        {/* Account Info */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Kontoinformation</h2>
              <p className="text-sm text-slate-500">Information om ditt konto</p>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center p-3 sm:p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-500">Konto-ID</p>
                  <p className="text-slate-900 font-mono text-xs sm:text-sm truncate">{user?.id?.slice(0, 8)}...</p>
                </div>
              </div>
            </div>

            <div className="flex items-center p-3 sm:p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-500">Konto skapat</p>
                  <p className="text-sm sm:text-base text-slate-900">
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
            </div>

            <div className="flex items-center p-3 sm:p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-500">Senast inloggad</p>
                  <p className="text-sm sm:text-base text-slate-900">
                    {user?.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString('sv-SE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Okänt'}
                  </p>
                </div>
              </div>
            </div>

            {profile?.updated_at && (
              <div className="flex items-center p-3 sm:p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Save className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-slate-500">Profil uppdaterad</p>
                    <p className="text-sm sm:text-base text-slate-900">
                      {new Date(profile.updated_at).toLocaleDateString('sv-SE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
