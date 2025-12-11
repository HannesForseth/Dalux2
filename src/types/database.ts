// Database types for Dalux2

export type ProjectStatus = 'active' | 'completed' | 'archived'
export type MemberStatus = 'pending' | 'active' | 'removed'
export type RoleName = 'owner' | 'admin' | 'member' | 'viewer'

export interface Profile {
  id: string
  full_name: string | null
  company: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectRole {
  id: string
  name: RoleName
  display_name: string
  description: string | null
  permissions: RolePermissions
  created_at: string
}

export interface RolePermissions {
  project: string[]
  members: string[]
  documents: string[]
  issues: string[]
  drawings: string[]
  checklists: string[]
}

export interface Project {
  id: string
  name: string
  description: string | null
  project_number: string | null
  address: string | null
  city: string | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_id: string
  invited_by: string | null
  invited_at: string
  joined_at: string | null
  status: MemberStatus
  created_at: string
}

export interface Company {
  id: string
  name: string
  org_number: string | null
  address: string | null
  city: string | null
  contact_email: string | null
  contact_phone: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectCompany {
  id: string
  project_id: string
  company_id: string
  role: string
  added_by: string | null
  added_at: string
}

export interface Invitation {
  id: string
  email: string
  project_id: string
  role_id: string
  company_id: string | null
  invited_by: string | null
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

// Extended types with relations
export interface ProjectMemberWithDetails extends ProjectMember {
  profile: Profile
  role: ProjectRole
}

export interface ProjectWithMembers extends Project {
  members: ProjectMemberWithDetails[]
}

export interface InvitationWithDetails extends Invitation {
  project: Project
  role: ProjectRole
  inviter: Profile | null
}

// Form types
export interface CreateProjectData {
  name: string
  description?: string
  project_number?: string
  address?: string
  city?: string
  start_date?: string
  end_date?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  project_number?: string
  address?: string
  city?: string
  status?: ProjectStatus
  start_date?: string
  end_date?: string
}

export interface InviteMemberData {
  email: string
  role_id: string
  company_id?: string
}

export interface CreateCompanyData {
  name: string
  org_number?: string
  address?: string
  city?: string
  contact_email?: string
  contact_phone?: string
}

export interface AddCompanyToProjectData {
  company_id: string
  role: string
}

// Pricing and subscription types
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing'
export type PlanName = 'free' | 'small' | 'medium' | 'large' | 'enterprise'

export interface PlanFeatures {
  issues: boolean
  checklists: boolean
  documents: boolean
  drawings: boolean
  notifications: boolean
  api: boolean
  templates: boolean
  reports: boolean
  priority_support?: boolean
}

export interface ProjectPlan {
  id: string
  name: PlanName
  display_name: string
  description: string | null
  base_price_monthly: number // in öre (19900 = 199 kr)
  included_users: number
  extra_user_price: number // in öre
  max_users: number | null // null = unlimited
  storage_mb: number // -1 = unlimited
  features: PlanFeatures
  stripe_base_price_id: string | null
  stripe_user_price_id: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface StorageAddon {
  id: string
  name: string
  display_name: string
  storage_mb: number
  price_monthly: number // in öre
  stripe_price_id: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ProjectSubscription {
  id: string
  project_id: string
  plan_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  status: SubscriptionStatus
  extra_users: number
  extra_storage_mb: number
  storage_addon_ids: string[]
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface ProjectSubscriptionWithPlan extends ProjectSubscription {
  plan: ProjectPlan
}

export interface ProjectWithPlan extends Project {
  plan?: ProjectPlan | null
  subscription?: ProjectSubscription | null
}

// Form types for creating projects with plans
export interface CreateProjectWithPlanData {
  name: string
  description?: string
  project_number?: string
  address?: string
  city?: string
  start_date?: string
  end_date?: string
  plan_id: string
  extra_users?: number
  storage_addon_ids?: string[]
}
