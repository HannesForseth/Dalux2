'use client'

import { useState, useEffect } from 'react'
import { inviteMember, getProjectRoles } from '@/app/actions/members'
import type { ProjectRole, RoleName } from '@/types/database'
import { getAssignableRoles, getRoleDisplayName, getRoleDescription } from '@/lib/permissions'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  userRole: RoleName
  onSuccess?: () => void
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  projectId,
  userRole,
  onSuccess,
}: InviteMemberModalProps) {
  const [roles, setRoles] = useState<ProjectRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const assignableRoleNames = getAssignableRoles(userRole)
  const assignableRoles = roles.filter((r) => assignableRoleNames.includes(r.name as RoleName))
  const selectedRole = assignableRoles.find((r) => r.id === selectedRoleId)

  useEffect(() => {
    if (isOpen) {
      loadRoles()
    }
  }, [isOpen])

  // Set default selected role when roles are loaded
  useEffect(() => {
    if (assignableRoles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(assignableRoles[0].id)
    }
  }, [assignableRoles.length, selectedRoleId])

  async function loadRoles() {
    try {
      const data = await getProjectRoles()
      setRoles(data)
    } catch (err) {
      console.error('Failed to load roles:', err)
    }
  }

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const roleId = formData.get('role_id') as string

    try {
      const result = await inviteMember(projectId, { email, role_id: roleId })

      if (result.type === 'added') {
        setSuccess('Användaren har lagts till i projektet.')
      } else {
        setSuccess('Inbjudan har skickats. Användaren får ett e-postmeddelande för att gå med.')
      }

      onSuccess?.()

      // Close after delay
      setTimeout(() => {
        onClose()
        setSuccess(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white sm:bg-slate-900 border border-slate-200 sm:border-slate-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center mb-3">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>

          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 sm:text-white">Bjud in medlem</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 sm:hover:text-white transition-colors"
            >
              <XIcon />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                E-postadress
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white placeholder-slate-400 sm:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="namn@foretag.se"
              />
            </div>

            <div>
              <label htmlFor="role_id" className="block text-sm font-medium text-slate-700 sm:text-slate-300 mb-1">
                Roll
              </label>
              <select
                id="role_id"
                name="role_id"
                required
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 sm:bg-slate-800 border border-slate-200 sm:border-slate-700 rounded-lg text-slate-900 sm:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {getRoleDisplayName(role.name as RoleName)}
                  </option>
                ))}
              </select>
              {selectedRole && (
                <p className="mt-1 text-xs text-slate-500">
                  {getRoleDescription(selectedRole.name as RoleName)}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-slate-600 sm:text-slate-300 hover:text-slate-900 sm:hover:text-white transition-colors border border-slate-200 sm:border-transparent rounded-lg sm:rounded-none"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Skickar...' : 'Bjud in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
