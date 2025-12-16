import { z } from 'zod'

// ===============================
// Common Schema Helpers
// ===============================

export const uuidSchema = z.string().uuid('Ogiltigt ID-format')
export const emailSchema = z.string().email('Ogiltig e-postadress')
export const urlSchema = z.string().url('Ogiltig URL').optional().nullable()

// ===============================
// Project Schemas
// ===============================

export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Projektnamn krävs')
    .max(100, 'Projektnamnet får inte vara längre än 100 tecken'),
  description: z.string()
    .max(1000, 'Beskrivningen får inte vara längre än 1000 tecken')
    .optional()
    .nullable(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed']).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  address: z.string().max(500, 'Adressen är för lång').optional().nullable(),
  city: z.string().max(100, 'Stadsnamnet är för långt').optional().nullable(),
  postal_code: z.string().max(20, 'Postnumret är för långt').optional().nullable(),
  country: z.string().max(100, 'Landets namn är för långt').optional().nullable(),
})

export const updateProjectSchema = createProjectSchema.partial()

export const projectIdSchema = z.object({
  projectId: uuidSchema,
})

// ===============================
// Member Schemas
// ===============================

export const inviteMemberSchema = z.object({
  projectId: uuidSchema,
  email: emailSchema,
  roleId: uuidSchema,
  groupId: uuidSchema.optional().nullable(),
  message: z.string().max(500, 'Meddelandet är för långt').optional(),
})

export const updateMemberRoleSchema = z.object({
  projectId: uuidSchema,
  userId: uuidSchema,
  roleId: uuidSchema,
})

export const removeMemberSchema = z.object({
  projectId: uuidSchema,
  userId: uuidSchema,
})

// ===============================
// Document Schemas
// ===============================

export const createFolderSchema = z.object({
  projectId: uuidSchema,
  name: z.string()
    .min(1, 'Mappnamn krävs')
    .max(100, 'Mappnamnet får inte vara längre än 100 tecken'),
  parentId: uuidSchema.optional().nullable(),
})

export const updateFolderSchema = z.object({
  folderId: uuidSchema,
  name: z.string()
    .min(1, 'Mappnamn krävs')
    .max(100, 'Mappnamnet får inte vara längre än 100 tecken'),
})

export const createDocumentSchema = z.object({
  project_id: uuidSchema,
  folder_id: uuidSchema.optional().nullable(),
  file_name: z.string()
    .min(1, 'Filnamn krävs')
    .max(255, 'Filnamnet är för långt'),
  file_type: z.string()
    .min(1, 'Filtyp krävs')
    .max(100, 'Filtypen är för lång'),
  file_size: z.number().int().positive('Filstorlek måste vara positiv'),
  storage_path: z.string().min(1, 'Sökväg krävs'),
  category: z.enum([
    'drawing', 'specification', 'report', 'contract', 'photo',
    'video', 'bim_model', 'schedule', 'correspondence', 'other'
  ]).optional(),
  description: z.string().max(1000, 'Beskrivningen är för lång').optional().nullable(),
})

// ===============================
// Issue/Deviation Schemas
// ===============================

export const createIssueSchema = z.object({
  project_id: uuidSchema,
  title: z.string()
    .min(1, 'Titel krävs')
    .max(200, 'Titeln får inte vara längre än 200 tecken'),
  description: z.string()
    .max(5000, 'Beskrivningen är för lång')
    .optional()
    .nullable(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().max(100, 'Kategorin är för lång').optional().nullable(),
  assigned_to: uuidSchema.optional().nullable(),
  due_date: z.string().optional().nullable(),
  location: z.string().max(200, 'Platsen är för lång').optional().nullable(),
})

export const updateIssueSchema = createIssueSchema.partial().omit({ project_id: true })

export const createDeviationSchema = z.object({
  project_id: uuidSchema,
  title: z.string()
    .min(1, 'Titel krävs')
    .max(200, 'Titeln får inte vara längre än 200 tecken'),
  description: z.string()
    .max(5000, 'Beskrivningen är för lång')
    .optional()
    .nullable(),
  status: z.enum(['open', 'investigating', 'action_required', 'corrected', 'verified', 'closed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().max(100, 'Kategorin är för lång').optional().nullable(),
  assigned_to: uuidSchema.optional().nullable(),
  due_date: z.string().optional().nullable(),
  location: z.string().max(200, 'Platsen är för lång').optional().nullable(),
  cost_impact: z.number().optional().nullable(),
  schedule_impact_days: z.number().int().optional().nullable(),
})

export const updateDeviationSchema = createDeviationSchema.partial().omit({ project_id: true })

// ===============================
// RFI Schemas
// ===============================

export const createRfiSchema = z.object({
  project_id: uuidSchema,
  subject: z.string()
    .min(1, 'Ämne krävs')
    .max(200, 'Ämnet får inte vara längre än 200 tecken'),
  question: z.string()
    .min(1, 'Fråga krävs')
    .max(5000, 'Frågan är för lång'),
  assigned_to: uuidSchema.optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().max(100, 'Kategorin är för lång').optional().nullable(),
})

export const updateRfiSchema = createRfiSchema.partial().omit({ project_id: true })

export const answerRfiSchema = z.object({
  rfiId: uuidSchema,
  answer: z.string()
    .min(1, 'Svar krävs')
    .max(5000, 'Svaret är för långt'),
})

// ===============================
// Checklist Schemas
// ===============================

export const createChecklistSchema = z.object({
  project_id: uuidSchema,
  name: z.string()
    .min(1, 'Namn krävs')
    .max(200, 'Namnet får inte vara längre än 200 tecken'),
  description: z.string()
    .max(1000, 'Beskrivningen är för lång')
    .optional()
    .nullable(),
  template_id: uuidSchema.optional().nullable(),
})

export const createChecklistItemSchema = z.object({
  checklist_id: uuidSchema,
  text: z.string()
    .min(1, 'Text krävs')
    .max(500, 'Texten är för lång'),
  order_index: z.number().int().optional(),
  is_required: z.boolean().optional(),
})

export const updateChecklistItemSchema = z.object({
  itemId: uuidSchema,
  text: z.string()
    .min(1, 'Text krävs')
    .max(500, 'Texten är för lång')
    .optional(),
  is_completed: z.boolean().optional(),
  completed_by: uuidSchema.optional().nullable(),
  notes: z.string().max(1000, 'Anteckningarna är för långa').optional().nullable(),
})

// ===============================
// Calendar Schemas
// ===============================

export const createCalendarEventSchema = z.object({
  project_id: uuidSchema,
  title: z.string()
    .min(1, 'Titel krävs')
    .max(200, 'Titeln får inte vara längre än 200 tecken'),
  description: z.string()
    .max(2000, 'Beskrivningen är för lång')
    .optional()
    .nullable(),
  start_time: z.string().min(1, 'Starttid krävs'),
  end_time: z.string().min(1, 'Sluttid krävs'),
  location: z.string().max(200, 'Platsen är för lång').optional().nullable(),
  event_type: z.enum(['meeting', 'inspection', 'deadline', 'milestone', 'other']).optional(),
  all_day: z.boolean().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.string().max(500).optional().nullable(),
})

export const updateCalendarEventSchema = createCalendarEventSchema.partial().omit({ project_id: true })

// ===============================
// Protocol Schemas
// ===============================

export const createProtocolSchema = z.object({
  project_id: uuidSchema,
  title: z.string()
    .min(1, 'Titel krävs')
    .max(200, 'Titeln får inte vara längre än 200 tecken'),
  meeting_type: z.enum(['byggmote', 'samordningsmote', 'projekteringsmote', 'startmote', 'slutmote', 'other']),
  meeting_date: z.string().min(1, 'Mötesdatum krävs'),
  location: z.string().max(200, 'Platsen är för lång').optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  notes: z.string().max(10000, 'Anteckningarna är för långa').optional().nullable(),
})

export const updateProtocolSchema = createProtocolSchema.partial().omit({ project_id: true })

export const addAttendeeSchema = z.object({
  protocolId: uuidSchema,
  name: z.string()
    .min(1, 'Namn krävs')
    .max(100, 'Namnet är för långt'),
  email: emailSchema.optional().nullable(),
  company: z.string().max(100, 'Företagsnamnet är för långt').optional().nullable(),
  role: z.enum(['chairperson', 'secretary', 'attendee', 'absent']).optional(),
  user_id: uuidSchema.optional().nullable(),
})

export const addAgendaItemSchema = z.object({
  protocolId: uuidSchema,
  title: z.string()
    .min(1, 'Titel krävs')
    .max(200, 'Titeln är för lång'),
  description: z.string()
    .max(2000, 'Beskrivningen är för lång')
    .optional()
    .nullable(),
  order_index: z.number().int().optional(),
  duration_minutes: z.number().int().positive().optional().nullable(),
})

export const addDecisionSchema = z.object({
  protocolId: uuidSchema,
  description: z.string()
    .min(1, 'Beslut krävs')
    .max(2000, 'Beslutet är för långt'),
  responsible_user_id: uuidSchema.optional().nullable(),
  responsible_name: z.string().max(100).optional().nullable(),
  deadline: z.string().optional().nullable(),
})

export const addActionItemSchema = z.object({
  protocolId: uuidSchema,
  description: z.string()
    .min(1, 'Beskrivning krävs')
    .max(2000, 'Beskrivningen är för lång'),
  assigned_to: uuidSchema.optional().nullable(),
  assigned_to_name: z.string().max(100).optional().nullable(),
  deadline: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

// ===============================
// Group Schemas
// ===============================

export const createGroupSchema = z.object({
  projectId: uuidSchema,
  name: z.string()
    .min(1, 'Gruppnamn krävs')
    .max(100, 'Gruppnamnet får inte vara längre än 100 tecken'),
  description: z.string()
    .max(500, 'Beskrivningen är för lång')
    .optional()
    .nullable(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Ogiltig färgkod')
    .optional(),
})

export const updateGroupSchema = createGroupSchema.partial().omit({ projectId: true })

// ===============================
// Comment Schemas
// ===============================

export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Kommentar krävs')
    .max(5000, 'Kommentaren är för lång'),
  parent_id: uuidSchema.optional().nullable(),
})

// ===============================
// Notification Schemas
// ===============================

export const markNotificationReadSchema = z.object({
  notificationId: uuidSchema,
})

// ===============================
// Profile Schemas
// ===============================

export const updateProfileSchema = z.object({
  full_name: z.string()
    .min(1, 'Namn krävs')
    .max(100, 'Namnet är för långt')
    .optional(),
  phone: z.string()
    .max(20, 'Telefonnumret är för långt')
    .optional()
    .nullable(),
  company: z.string()
    .max(100, 'Företagsnamnet är för långt')
    .optional()
    .nullable(),
  title: z.string()
    .max(100, 'Titeln är för lång')
    .optional()
    .nullable(),
})

// ===============================
// Validation Helper
// ===============================

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message).join(', ')
    throw new Error(errors)
  }
  return result.data
}
