'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, CreditCard, Trash2, Settings, Building2, Save, ExternalLink, ImageIcon, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { getProject, getUserRoleInProject, updateProject, deleteProject, uploadProjectImage, removeProjectImage } from '@/app/actions/projects'
import { getProjectSubscription } from '@/app/actions/plans'
import type { Project, RoleName, ProjectPlan } from '@/types/database'
import { canUpdateProject, canDeleteProject, isOwner } from '@/lib/permissions'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [currentPlan, setCurrentPlan] = useState<ProjectPlan | null>(null)
  const [userRole, setUserRole] = useState<RoleName | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      const [projectData, role, subscriptionData] = await Promise.all([
        getProject(projectId),
        getUserRoleInProject(projectId),
        getProjectSubscription(projectId),
      ])
      setProject(projectData)
      setUserRole(role as RoleName)
      setCurrentPlan(subscriptionData.plan)

      // Set form values
      if (projectData) {
        setName(projectData.name)
        setDescription(projectData.description || '')
        setProjectNumber(projectData.project_number || '')
        setAddress(projectData.address || '')
        setCity(projectData.city || '')
        setImageUrl(projectData.image_url || null)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault()
    if (!userRole || !canUpdateProject(userRole)) return

    setIsSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      await updateProject(projectId, {
        name,
        description: description || undefined,
        project_number: projectNumber || undefined,
        address: address || undefined,
        city: city || undefined,
      })
      setSuccessMessage('Projektinformationen har sparats')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunde inte spara ändringar')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteProject() {
    if (!project || deleteConfirmText !== project.name) return

    setIsDeleting(true)
    try {
      await deleteProject(projectId)
      router.push('/projects')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Kunde inte radera projektet')
      setIsDeleting(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const result = await uploadProjectImage(projectId, formData)

      if (result.success && result.url) {
        setImageUrl(result.url)
        setSuccessMessage('Projektbilden har laddats upp')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage(result.error || 'Kunde inte ladda upp bilden')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunde inte ladda upp bilden')
    } finally {
      setIsUploadingImage(false)
      // Reset input
      e.target.value = ''
    }
  }

  async function handleRemoveImage() {
    setIsUploadingImage(true)
    setErrorMessage('')

    try {
      const result = await removeProjectImage(projectId)

      if (result.success) {
        setImageUrl(null)
        setSuccessMessage('Projektbilden har tagits bort')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage(result.error || 'Kunde inte ta bort bilden')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunde inte ta bort bilden')
    } finally {
      setIsUploadingImage(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded-xl w-1/3" />
        <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 h-64" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Building2 className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Projektet hittades inte</h2>
        <Link href="/projects" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Tillbaka till projekt
        </Link>
      </div>
    )
  }

  const canEdit = userRole && canUpdateProject(userRole)
  const canDelete = userRole && canDeleteProject(userRole)
  const isProjectOwner = userRole && isOwner(userRole)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projektinställningar</h1>
          <p className="text-slate-500">{project.name}</p>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Project Information */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Projektinformation</h2>
              <p className="text-sm text-slate-500">Grundläggande information om projektet</p>
            </div>
          </div>

          <form onSubmit={handleSaveProject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Projektnamn *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Projektnummer
                </label>
                <input
                  type="text"
                  value={projectNumber}
                  onChange={(e) => setProjectNumber(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Beskrivning
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Adress
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Stad
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {canEdit && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Sparar...' : 'Spara ändringar'}
                </button>
              </div>
            )}
          </form>
        </motion.div>

        {/* Project Image */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Projektbild</h2>
              <p className="text-sm text-slate-500">Visas i projektlistan</p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            {/* Image Preview */}
            <div className="relative w-48 h-32 bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 flex-shrink-0">
              {imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={project.name}
                    fill
                    className="object-cover"
                  />
                  {canEdit && (
                    <button
                      onClick={handleRemoveImage}
                      disabled={isUploadingImage}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      title="Ta bort bild"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-xs">Ingen bild</span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <p className="text-sm text-slate-600 mb-3">
                Ladda upp en bild som representerar projektet. Bilden visas i projektlistan och hjälper dig att snabbt identifiera projektet.
              </p>

              {canEdit && (
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {isUploadingImage ? 'Laddar upp...' : (imageUrl ? 'Byt bild' : 'Ladda upp bild')}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    JPG, PNG, WebP eller GIF. Max 5 MB.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Plan & Subscription */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Projektplan</h2>
                <p className="text-sm text-slate-500">Hantera din prenumeration</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Nuvarande plan</p>
                <p className="text-xl font-bold text-slate-900">
                  {currentPlan?.display_name || 'Ingen plan'}
                </p>
                {currentPlan && (
                  <p className="text-sm text-slate-600 mt-1">
                    {currentPlan.base_price_monthly === 0
                      ? 'Gratis'
                      : `${(currentPlan.base_price_monthly / 100).toLocaleString('sv-SE')} kr/mån`}
                    {' • '}
                    {currentPlan.included_users} användare inkluderade
                    {currentPlan.storage_mb > 0 && ` • ${currentPlan.storage_mb} MB lagring`}
                  </p>
                )}
              </div>
              {isProjectOwner && (
                <Link
                  href={`/projects/new?upgrade=${projectId}`}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  Ändra plan
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {currentPlan?.features && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Inkluderade funktioner:</p>
              <ul className="grid grid-cols-2 gap-2">
                {Object.entries(currentPlan.features).map(([key, value]) => (
                  value && (
                    <li key={key} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  )
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* Quick Links */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Snabblänkar</h2>
              <p className="text-sm text-slate-500">Hantera andra projektinställningar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={`/dashboard/projects/${projectId}/settings/members`}
              className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Medlemmar</p>
                <p className="text-sm text-slate-500">Hantera projektmedlemmar och roller</p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Danger Zone */}
        {canDelete && (
          <motion.div
            variants={itemVariants}
            className="bg-white/80 backdrop-blur-sm border border-red-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-700">Farozon</h2>
                <p className="text-sm text-red-500">Dessa åtgärder kan inte ångras</p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900">Radera projekt</p>
                  <p className="text-sm text-slate-600">
                    Permanent radering av projektet och all tillhörande data
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Radera projekt
                </button>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-700">Bekräfta radering</p>
                    <p className="text-sm text-red-600 mt-1">
                      Detta kommer permanent radera projektet &quot;{project.name}&quot; och all dess data
                      inklusive dokument, ärenden, avvikelser, protokoll och alla andra poster.
                      Denna åtgärd kan INTE ångras.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">
                    Skriv projektnamnet för att bekräfta: <span className="font-bold">{project.name}</span>
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={project.name}
                    className="w-full px-4 py-2.5 border border-red-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    disabled={deleteConfirmText !== project.name || isDeleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        Raderar...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Radera permanent
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
