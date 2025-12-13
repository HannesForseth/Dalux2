'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectWithMembers,
  ProjectMemberWithDetails
} from '@/types/database'

export async function getMyProjects(): Promise<Project[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    throw new Error('Kunde inte hämta projekt')
  }

  return data || []
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getProject: User not authenticated')
      return null
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching project:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('getProject unexpected error:', err)
    return null
  }
}

export async function getProjectWithMembers(projectId: string): Promise<ProjectWithMembers | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError) {
    if (projectError.code === 'PGRST116') {
      return null
    }
    throw new Error('Kunde inte hämta projekt')
  }

  // Get members with their profiles and roles
  // Use !inner join hint with foreign key name to disambiguate
  // (project_members has two FKs to profiles: user_id and invited_by)
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles!project_members_user_id_fkey(*),
      role:project_roles(*)
    `)
    .eq('project_id', projectId)
    .eq('status', 'active')

  if (membersError) {
    console.error('Error fetching members:', membersError)
    throw new Error('Kunde inte hämta medlemmar')
  }

  return {
    ...project,
    members: members as ProjectMemberWithDetails[]
  }
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      ...data,
      created_by: user.id,
    })
    .select()
    .single()

  if (projectError) {
    console.error('Error creating project:', projectError)
    throw new Error('Kunde inte skapa projekt')
  }

  // Get the owner role
  const { data: ownerRole, error: roleError } = await supabase
    .from('project_roles')
    .select('id')
    .eq('name', 'owner')
    .single()

  if (roleError || !ownerRole) {
    // Rollback project creation
    await supabase.from('projects').delete().eq('id', project.id)
    throw new Error('Kunde inte hitta ägarrollen')
  }

  // Add creator as project owner
  const { error: memberError } = await supabase
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: user.id,
      role_id: ownerRole.id,
      invited_by: user.id,
      joined_at: new Date().toISOString(),
      status: 'active',
    })

  if (memberError) {
    // Rollback project creation
    await supabase.from('projects').delete().eq('id', project.id)
    console.error('Error adding owner as member:', memberError)
    throw new Error('Kunde inte lägga till ägare som medlem')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/projects')

  return project
}

export async function updateProject(
  projectId: string,
  data: UpdateProjectData
): Promise<Project> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error)
    throw new Error('Kunde inte uppdatera projekt')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)

  return project
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('Error deleting project:', error)
    throw new Error('Kunde inte radera projekt')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/projects')
}

export async function getUserRoleInProject(projectId: string): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getUserRoleInProject: User not authenticated')
      return null
    }

    // Use explicit FK name to avoid ambiguity
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        role_id,
        project_roles!project_members_role_id_fkey(name)
      `)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('getUserRoleInProject error:', error)
      }
      return null
    }

    if (!data) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any)?.project_roles?.name || null
  } catch (err) {
    console.error('getUserRoleInProject unexpected error:', err)
    return null
  }
}

export interface ProjectStats {
  documentsCount: number
  issuesCount: number
  openIssuesCount: number
  checklistsCount: number
  completedChecklistsCount: number
  rfisCount: number
  openRfisCount: number
  protocolsCount: number
  draftProtocolsCount: number
  unseenProtocolsCount: number
}

export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Fetch all counts in parallel
  const [
    documentsResult,
    issuesResult,
    openIssuesResult,
    checklistsResult,
    completedChecklistsResult,
    rfisResult,
    openRfisResult,
    protocolsResult,
    draftProtocolsResult
  ] = await Promise.all([
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('issues').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('issues').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['open', 'in_progress']),
    supabase.from('checklists').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('checklists').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'completed'),
    supabase.from('rfis').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('rfis').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['open', 'pending']),
    supabase.from('protocols').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('protocols').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'draft')
  ])

  // Count unseen protocols (protocols user hasn't viewed yet)
  // Get protocols that are finalized and user hasn't viewed
  const { data: viewedProtocols } = await supabase
    .from('protocol_views')
    .select('protocol_id')
    .eq('user_id', user.id)

  const viewedIds = viewedProtocols?.map(v => v.protocol_id) || []

  let unseenCount = 0
  if (viewedIds.length === 0) {
    // User hasn't viewed any - count all finalized
    const { count } = await supabase
      .from('protocols')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'finalized')
    unseenCount = count || 0
  } else {
    // Count finalized protocols not in viewed list
    const { count } = await supabase
      .from('protocols')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'finalized')
      .not('id', 'in', `(${viewedIds.join(',')})`)
    unseenCount = count || 0
  }

  return {
    documentsCount: documentsResult.count || 0,
    issuesCount: issuesResult.count || 0,
    openIssuesCount: openIssuesResult.count || 0,
    checklistsCount: checklistsResult.count || 0,
    completedChecklistsCount: completedChecklistsResult.count || 0,
    rfisCount: rfisResult.count || 0,
    openRfisCount: openRfisResult.count || 0,
    protocolsCount: protocolsResult.count || 0,
    draftProtocolsCount: draftProtocolsResult.count || 0,
    unseenProtocolsCount: unseenCount
  }
}

export type ActivityType =
  | 'document_uploaded'
  | 'document_updated'
  | 'document_version'
  | 'document_comment'
  | 'issue_created'
  | 'issue_updated'
  | 'checklist_created'
  | 'checklist_completed'
  | 'protocol_created'
  | 'protocol_finalized'

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  user: {
    id: string
    name: string
    avatar?: string
  }
  metadata?: {
    documentId?: string
    documentName?: string
    issueId?: string
    checklistId?: string
    protocolId?: string
    version?: number
    commentId?: string
  }
}

export async function getProjectActivity(projectId: string, limit: number = 20): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const activities: ActivityItem[] = []

  // Fetch recent documents (uploaded/updated)
  const { data: documents } = await supabase
    .from('documents')
    .select(`
      id,
      name,
      created_at,
      updated_at,
      version,
      uploaded_by,
      uploader:profiles!documents_uploaded_by_fkey(id, full_name, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .limit(10)

  if (documents) {
    for (const doc of documents) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uploaderData = doc.uploader as any
      const uploader = Array.isArray(uploaderData) ? uploaderData[0] : uploaderData

      // Check if it was recently updated (different from created)
      const createdAt = new Date(doc.created_at).getTime()
      const updatedAt = new Date(doc.updated_at).getTime()
      const isUpdate = updatedAt - createdAt > 60000 // More than 1 minute difference

      activities.push({
        id: `doc-${doc.id}-${isUpdate ? 'update' : 'create'}`,
        type: isUpdate ? 'document_updated' : 'document_uploaded',
        title: isUpdate ? 'Dokument uppdaterat' : 'Nytt dokument',
        description: doc.name,
        timestamp: isUpdate ? doc.updated_at : doc.created_at,
        user: {
          id: uploader?.id || '',
          name: uploader?.full_name || 'Okänd användare',
          avatar: uploader?.avatar_url || undefined
        },
        metadata: {
          documentId: doc.id,
          documentName: doc.name,
          version: doc.version
        }
      })
    }
  }

  // Fetch recent document versions
  const { data: versions } = await supabase
    .from('document_versions')
    .select(`
      id,
      version,
      change_note,
      created_at,
      document:documents!document_versions_document_id_fkey(id, name, project_id),
      uploader:profiles!document_versions_uploaded_by_fkey(id, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (versions) {
    for (const ver of versions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docData = ver.document as any
      const doc = Array.isArray(docData) ? docData[0] : docData
      if (doc?.project_id !== projectId) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uploaderData = ver.uploader as any
      const uploader = Array.isArray(uploaderData) ? uploaderData[0] : uploaderData

      activities.push({
        id: `ver-${ver.id}`,
        type: 'document_version',
        title: `Ny version (v${ver.version})`,
        description: ver.change_note || doc?.name || 'Dokument',
        timestamp: ver.created_at,
        user: {
          id: uploader?.id || '',
          name: uploader?.full_name || 'Okänd användare',
          avatar: uploader?.avatar_url || undefined
        },
        metadata: {
          documentId: doc?.id,
          documentName: doc?.name,
          version: ver.version
        }
      })
    }
  }

  // Fetch recent document comments
  const { data: comments } = await supabase
    .from('document_comments')
    .select(`
      id,
      content,
      created_at,
      document:documents!document_comments_document_id_fkey(id, name),
      author:profiles!document_comments_author_id_fkey(id, full_name, avatar_url)
    `)
    .eq('project_id', projectId)
    .is('parent_id', null) // Only top-level comments
    .order('created_at', { ascending: false })
    .limit(10)

  if (comments) {
    for (const comment of comments) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docData = comment.document as any
      const doc = Array.isArray(docData) ? docData[0] : docData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authorData = comment.author as any
      const author = Array.isArray(authorData) ? authorData[0] : authorData

      activities.push({
        id: `comment-${comment.id}`,
        type: 'document_comment',
        title: 'Ny kommentar',
        description: `${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}`,
        timestamp: comment.created_at,
        user: {
          id: author?.id || '',
          name: author?.full_name || 'Okänd användare',
          avatar: author?.avatar_url || undefined
        },
        metadata: {
          documentId: doc?.id,
          documentName: doc?.name,
          commentId: comment.id
        }
      })
    }
  }

  // Fetch recent issues
  const { data: issues } = await supabase
    .from('issues')
    .select(`
      id,
      title,
      status,
      created_at,
      updated_at,
      reporter:profiles!issues_reported_by_fkey(id, full_name, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (issues) {
    for (const issue of issues) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reporterData = issue.reporter as any
      const reporter = Array.isArray(reporterData) ? reporterData[0] : reporterData

      activities.push({
        id: `issue-${issue.id}`,
        type: 'issue_created',
        title: 'Ny avvikelse',
        description: issue.title,
        timestamp: issue.created_at,
        user: {
          id: reporter?.id || '',
          name: reporter?.full_name || 'Okänd användare',
          avatar: reporter?.avatar_url || undefined
        },
        metadata: {
          issueId: issue.id
        }
      })
    }
  }

  // Fetch recent checklists
  const { data: checklists } = await supabase
    .from('checklists')
    .select(`
      id,
      name,
      status,
      created_at,
      completed_at,
      creator:profiles!checklists_created_by_fkey(id, full_name, avatar_url),
      completer:profiles!checklists_completed_by_fkey(id, full_name, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (checklists) {
    for (const checklist of checklists) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creatorData = checklist.creator as any
      const creator = Array.isArray(creatorData) ? creatorData[0] : creatorData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completerData = checklist.completer as any
      const completer = Array.isArray(completerData) ? completerData[0] : completerData

      activities.push({
        id: `checklist-${checklist.id}-create`,
        type: 'checklist_created',
        title: 'Ny checklista',
        description: checklist.name,
        timestamp: checklist.created_at,
        user: {
          id: creator?.id || '',
          name: creator?.full_name || 'Okänd användare',
          avatar: creator?.avatar_url || undefined
        },
        metadata: {
          checklistId: checklist.id
        }
      })

      if (checklist.status === 'completed' && checklist.completed_at) {
        activities.push({
          id: `checklist-${checklist.id}-complete`,
          type: 'checklist_completed',
          title: 'Checklista slutförd',
          description: checklist.name,
          timestamp: checklist.completed_at,
          user: {
            id: completer?.id || creator?.id || '',
            name: completer?.full_name || creator?.full_name || 'Okänd användare',
            avatar: completer?.avatar_url || creator?.avatar_url || undefined
          },
          metadata: {
            checklistId: checklist.id
          }
        })
      }
    }
  }

  // Fetch recent protocols
  const { data: protocols } = await supabase
    .from('protocols')
    .select(`
      id,
      title,
      protocol_number,
      meeting_type,
      status,
      created_at,
      updated_at,
      creator:profiles!protocols_created_by_fkey(id, full_name, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (protocols) {
    for (const protocol of protocols) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creatorData = protocol.creator as any
      const creator = Array.isArray(creatorData) ? creatorData[0] : creatorData

      activities.push({
        id: `protocol-${protocol.id}-create`,
        type: 'protocol_created',
        title: 'Nytt protokoll',
        description: `${protocol.title} (#${protocol.protocol_number})`,
        timestamp: protocol.created_at,
        user: {
          id: creator?.id || '',
          name: creator?.full_name || 'Okänd användare',
          avatar: creator?.avatar_url || undefined
        },
        metadata: {
          protocolId: protocol.id
        }
      })

      // If protocol was finalized, add finalized activity
      if (protocol.status === 'finalized' && protocol.updated_at !== protocol.created_at) {
        activities.push({
          id: `protocol-${protocol.id}-finalized`,
          type: 'protocol_finalized',
          title: 'Protokoll slutfört',
          description: `${protocol.title} (#${protocol.protocol_number})`,
          timestamp: protocol.updated_at,
          user: {
            id: creator?.id || '',
            name: creator?.full_name || 'Okänd användare',
            avatar: creator?.avatar_url || undefined
          },
          metadata: {
            protocolId: protocol.id
          }
        })
      }
    }
  }

  // Sort all activities by timestamp (newest first) and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}
