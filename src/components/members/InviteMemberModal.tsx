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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Bjud in medlem</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
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
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                E-postadress
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="namn@foretag.se"
              />
            </div>

            <div>
              <label htmlFor="role_id" className="block text-sm font-medium text-slate-300 mb-1">
                Roll
              </label>
              <select
                id="role_id"
                name="role_id"
                required
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
