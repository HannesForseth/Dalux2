// Database types for Dalux2

export type ProjectStatus = 'active' | 'completed' | 'archived'
export type MemberStatus = 'pending' | 'active' | 'removed'
export type RoleName = 'owner' | 'admin' | 'member' | 'viewer'

// Module status types
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical'
export type ChecklistStatus = 'draft' | 'in_progress' | 'completed' | 'approved'
export type RfiStatus = 'open' | 'pending' | 'answered' | 'closed'
export type RfiPriority = 'low' | 'medium' | 'high' | 'urgent'

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
  image_url: string | null
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

// ===============================
// Document Module Types
// ===============================

export interface Document {
  id: string
  project_id: string
  name: string
  description: string | null
  file_path: string
  file_size: number
  file_type: string
  folder_path: string
  version: number
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface DocumentWithUploader extends Document {
  uploader: Profile
}

export interface CreateDocumentData {
  name: string
  description?: string
  folder_path?: string
}

export interface UpdateDocumentData {
  name?: string
  description?: string
  folder_path?: string
}

// ===============================
// Issue (Avvikelse) Module Types
// ===============================

export interface Issue {
  id: string
  project_id: string
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  location: string | null
  reported_by: string
  assigned_to: string | null
  due_date: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface IssueAttachment {
  id: string
  issue_id: string
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_by: string
  created_at: string
}

export interface IssueComment {
  id: string
  issue_id: string
  content: string
  author_id: string
  created_at: string
  updated_at: string
}

export interface IssueCommentWithAuthor extends IssueComment {
  author: Profile
}

export interface IssueWithDetails extends Issue {
  reporter: Profile
  assignee: Profile | null
  attachments?: IssueAttachment[]
  comments?: IssueCommentWithAuthor[]
}

export interface CreateIssueData {
  title: string
  description?: string
  status?: IssueStatus
  priority?: IssuePriority
  location?: string
  assigned_to?: string
  due_date?: string
}

export interface UpdateIssueData {
  title?: string
  description?: string
  status?: IssueStatus
  priority?: IssuePriority
  location?: string
  assigned_to?: string | null
  due_date?: string | null
}

// ===============================
// Drawing (Ritning) Module Types
// ===============================

export interface Drawing {
  id: string
  project_id: string
  name: string
  description: string | null
  drawing_number: string | null
  revision: string
  file_path: string
  file_size: number
  file_type: string
  category: string | null
  is_current: boolean
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface DrawingWithUploader extends Drawing {
  uploader: Profile
}

export interface CreateDrawingData {
  name: string
  description?: string
  drawing_number?: string
  revision?: string
  category?: string
}

export interface UpdateDrawingData {
  name?: string
  description?: string
  drawing_number?: string
  revision?: string
  category?: string
  is_current?: boolean
}

// ===============================
// Checklist Module Types
// ===============================

export interface Checklist {
  id: string
  project_id: string
  name: string
  description: string | null
  template_id: string | null
  status: ChecklistStatus
  location: string | null
  due_date: string | null
  created_by: string
  completed_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  title: string
  description: string | null
  is_required: boolean
  is_checked: boolean
  checked_by: string | null
  checked_at: string | null
  sort_order: number
  created_at: string
}

export interface ChecklistItemWithChecker extends ChecklistItem {
  checker: Profile | null
}

export interface ChecklistWithDetails extends Checklist {
  creator: Profile
  completer: Profile | null
  items: ChecklistItemWithChecker[]
  progress: {
    total: number
    checked: number
    percentage: number
  }
}

export interface CreateChecklistData {
  name: string
  description?: string
  status?: ChecklistStatus
  location?: string
  due_date?: string
  items?: CreateChecklistItemData[]
}

export interface CreateChecklistItemData {
  title: string
  description?: string
  is_required?: boolean
  sort_order?: number
}

export interface UpdateChecklistData {
  name?: string
  description?: string
  status?: ChecklistStatus
  location?: string
  due_date?: string | null
}

export interface UpdateChecklistItemData {
  title?: string
  description?: string
  is_required?: boolean
  is_checked?: boolean
  sort_order?: number
}

// ===============================
// RFI (Frågor & Svar) Module Types
// ===============================

export interface Rfi {
  id: string
  project_id: string
  rfi_number: number
  subject: string
  question: string
  answer: string | null
  status: RfiStatus
  priority: RfiPriority
  category: string | null
  requested_by: string
  assigned_to: string | null
  answered_by: string | null
  due_date: string | null
  answered_at: string | null
  closed_at: string | null
  related_drawing_id: string | null
  related_document_id: string | null
  created_at: string
  updated_at: string
}

export interface RfiAttachment {
  id: string
  rfi_id: string
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_by: string
  created_at: string
}

export interface RfiWithDetails extends Rfi {
  requester: Profile
  assignee: Profile | null
  answerer: Profile | null
  attachments?: RfiAttachment[]
  related_drawing?: Drawing | null
  related_document?: Document | null
}

export interface CreateRfiData {
  subject: string
  question: string
  status?: RfiStatus
  priority?: RfiPriority
  category?: string
  assigned_to?: string
  due_date?: string
  related_drawing_id?: string
  related_document_id?: string
}

export interface UpdateRfiData {
  subject?: string
  question?: string
  status?: RfiStatus
  priority?: RfiPriority
  category?: string
  assigned_to?: string | null
  due_date?: string | null
}

export interface AnswerRfiData {
  answer: string
}

// ===============================
// Document Version Types
// ===============================

export interface DocumentVersion {
  id: string
  document_id: string
  version: number
  file_path: string
  file_size: number
  change_note: string | null
  uploaded_by: string
  created_at: string
}

export interface DocumentVersionWithUploader extends DocumentVersion {
  uploader: Profile
}

export interface DocumentWithVersions extends Document {
  versions?: DocumentVersionWithUploader[]
}

// ===============================
// Deviation (Avvikelse/NCR) Module Types
// ===============================

export type DeviationStatus =
  | 'open'            // Öppen - nyrapporterad
  | 'investigating'   // Under utredning
  | 'action_required' // Kräver åtgärd
  | 'corrected'       // Åtgärdad
  | 'verified'        // Verifierad
  | 'closed'          // Stängd

export type DeviationSeverity = 'minor' | 'major' | 'critical'

export type DeviationCategory =
  | 'material'        // Materialfel
  | 'workmanship'     // Utförandefel
  | 'design'          // Projekteringsfel
  | 'safety'          // Säkerhetsavvikelse
  | 'documentation'   // Dokumentationsfel
  | 'other'           // Övrigt

export interface Deviation {
  id: string
  project_id: string
  deviation_number: number
  title: string
  description: string | null
  category: DeviationCategory
  severity: DeviationSeverity
  status: DeviationStatus
  location: string | null
  drawing_reference: string | null
  due_date: string | null
  corrected_at: string | null
  verified_at: string | null
  closed_at: string | null
  reported_by: string
  assigned_to: string | null
  corrected_by: string | null
  verified_by: string | null
  corrective_action: string | null
  root_cause: string | null
  created_at: string
  updated_at: string
}

export interface DeviationAttachment {
  id: string
  deviation_id: string
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_by: string
  created_at: string
}

export interface DeviationComment {
  id: string
  deviation_id: string
  content: string
  author_id: string
  created_at: string
}

export interface DeviationCommentWithAuthor extends DeviationComment {
  author: Profile
}

export interface DeviationWithDetails extends Deviation {
  reporter: Profile
  assignee: Profile | null
  corrector: Profile | null
  verifier: Profile | null
  attachments?: DeviationAttachment[]
  comments?: DeviationCommentWithAuthor[]
}

export interface CreateDeviationData {
  title: string
  description?: string
  category: DeviationCategory
  severity?: DeviationSeverity
  location?: string
  drawing_reference?: string
  assigned_to?: string
  due_date?: string
}

export interface UpdateDeviationData {
  title?: string
  description?: string
  category?: DeviationCategory
  severity?: DeviationSeverity
  status?: DeviationStatus
  location?: string
  drawing_reference?: string
  assigned_to?: string | null
  due_date?: string | null
  corrective_action?: string
  root_cause?: string
}
