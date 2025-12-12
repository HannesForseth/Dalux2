'use server'

import { createClient } from '@/lib/supabase/server'
import type { StatusHistoryWithUser, StatusHistoryEntityType } from '@/types/database'

export async function getStatusHistory(
  entityType: StatusHistoryEntityType,
  entityId: string
): Promise<StatusHistoryWithUser[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('status_history')
      .select(`
        *,
        changer:profiles!status_history_changed_by_fkey(*)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('Error fetching status history:', error)
      return []
    }

    return data as StatusHistoryWithUser[]
  } catch (err) {
    console.error('getStatusHistory unexpected error:', err)
    return []
  }
}

// Helper to format status for display
export function formatStatusLabel(
  entityType: StatusHistoryEntityType,
  status: string
): string {
  const labels: Record<StatusHistoryEntityType, Record<string, string>> = {
    deviation: {
      open: 'Öppen',
      investigating: 'Under utredning',
      action_required: 'Kräver åtgärd',
      corrected: 'Åtgärdad',
      verified: 'Verifierad',
      closed: 'Stängd',
    },
    issue: {
      open: 'Öppen',
      in_progress: 'Pågående',
      resolved: 'Löst',
      closed: 'Stängd',
    },
    rfi: {
      open: 'Öppen',
      pending: 'Väntar',
      answered: 'Besvarad',
      closed: 'Stängd',
    },
  }

  return labels[entityType]?.[status] || status
}
