import type { RoleName, RolePermissions } from '@/types/database'

// Permission matrix for all roles
const ROLE_PERMISSIONS: Record<RoleName, RolePermissions> = {
  owner: {
    project: ['read', 'update', 'delete', 'transfer'],
    members: ['read', 'invite', 'remove', 'change_role'],
    documents: ['read', 'create', 'update', 'delete'],
    issues: ['read', 'create', 'update', 'delete', 'assign'],
    drawings: ['read', 'upload', 'delete'],
    checklists: ['read', 'create', 'update', 'delete'],
  },
  admin: {
    project: ['read', 'update'],
    members: ['read', 'invite', 'remove'],
    documents: ['read', 'create', 'update', 'delete'],
    issues: ['read', 'create', 'update', 'delete', 'assign'],
    drawings: ['read', 'upload', 'delete'],
    checklists: ['read', 'create', 'update', 'delete'],
  },
  member: {
    project: ['read'],
    members: ['read'],
    documents: ['read', 'create', 'update'],
    issues: ['read', 'create', 'update'],
    drawings: ['read'],
    checklists: ['read', 'create', 'update'],
  },
  viewer: {
    project: ['read'],
    members: ['read'],
    documents: ['read'],
    issues: ['read'],
    drawings: ['read'],
    checklists: ['read'],
  },
}

export type Resource = keyof RolePermissions
export type Action = string

/**
 * Check if a role has permission to perform an action on a resource
 */
export function hasPermission(
  roleName: RoleName,
  resource: Resource,
  action: Action
): boolean {
  const permissions = ROLE_PERMISSIONS[roleName]
  if (!permissions) return false

  const resourcePermissions = permissions[resource]
  if (!resourcePermissions) return false

  return resourcePermissions.includes(action)
}

/**
 * Check if a role can manage members (invite, remove, change roles)
 */
export function canManageMembers(roleName: RoleName): boolean {
  return hasPermission(roleName, 'members', 'invite')
}

/**
 * Check if a role can delete the project
 */
export function canDeleteProject(roleName: RoleName): boolean {
  return hasPermission(roleName, 'project', 'delete')
}

/**
 * Check if a role can update the project
 */
export function canUpdateProject(roleName: RoleName): boolean {
  return hasPermission(roleName, 'project', 'update')
}

/**
 * Check if a role can change member roles
 */
export function canChangeRoles(roleName: RoleName): boolean {
  return hasPermission(roleName, 'members', 'change_role')
}

/**
 * Check if a role is an admin-level role (owner or admin)
 */
export function isAdmin(roleName: RoleName): boolean {
  return roleName === 'owner' || roleName === 'admin'
}

/**
 * Check if a role is the project owner
 */
export function isOwner(roleName: RoleName): boolean {
  return roleName === 'owner'
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(roleName: RoleName): RolePermissions | null {
  return ROLE_PERMISSIONS[roleName] || null
}

/**
 * Get display name for a role (Swedish)
 */
export function getRoleDisplayName(roleName: RoleName): string {
  const displayNames: Record<RoleName, string> = {
    owner: 'Projektägare',
    admin: 'Administratör',
    member: 'Medlem',
    viewer: 'Läsbehörighet',
  }
  return displayNames[roleName] || roleName
}

/**
 * Get role description (Swedish)
 */
export function getRoleDescription(roleName: RoleName): string {
  const descriptions: Record<RoleName, string> = {
    owner: 'Full kontroll över projektet inklusive radering och överföring av ägandeskap',
    admin: 'Kan hantera medlemmar och har full tillgång till alla moduler',
    member: 'Kan skapa och redigera innehåll i projektet',
    viewer: 'Kan endast visa projektinnehåll',
  }
  return descriptions[roleName] || ''
}

/**
 * Get all available roles sorted by privilege level
 */
export function getAllRoles(): RoleName[] {
  return ['owner', 'admin', 'member', 'viewer']
}

/**
 * Get roles that a user with given role can assign to others
 */
export function getAssignableRoles(userRole: RoleName): RoleName[] {
  if (userRole === 'owner') {
    return ['admin', 'member', 'viewer']
  }
  if (userRole === 'admin') {
    return ['member', 'viewer']
  }
  return []
}
