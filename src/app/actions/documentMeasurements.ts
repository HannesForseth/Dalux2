'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  DocumentMeasurement,
  DocumentMeasurementWithCreator,
  ScaleCalibration,
  CreateMeasurementData,
  UpdateMeasurementData,
  CreateCalibrationData,
  MeasurementPoint
} from '@/types/database'

// ===============================
// Measurement CRUD Operations
// ===============================

export async function getDocumentMeasurements(
  documentId: string
): Promise<DocumentMeasurementWithCreator[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('getDocumentMeasurements: User not authenticated')
      return []
    }

    const { data, error } = await supabase
      .from('document_measurements')
      .select(`
        *,
        creator:profiles!document_measurements_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching document measurements:', error)
      return []
    }

    // Parse the points JSONB field
    return (data || []).map(m => ({
      ...m,
      points: (typeof m.points === 'string' ? JSON.parse(m.points) : m.points) as MeasurementPoint[]
    })) as DocumentMeasurementWithCreator[]
  } catch (err) {
    console.error('getDocumentMeasurements unexpected error:', err)
    return []
  }
}

export async function getMeasurementsByPage(
  documentId: string,
  pageNumber: number
): Promise<DocumentMeasurementWithCreator[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('document_measurements')
      .select(`
        *,
        creator:profiles!document_measurements_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq('document_id', documentId)
      .eq('page_number', pageNumber)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching page measurements:', error)
      return []
    }

    return (data || []).map(m => ({
      ...m,
      points: (typeof m.points === 'string' ? JSON.parse(m.points) : m.points) as MeasurementPoint[]
    })) as DocumentMeasurementWithCreator[]
  } catch (err) {
    console.error('getMeasurementsByPage unexpected error:', err)
    return []
  }
}

export async function createMeasurement(
  documentId: string,
  projectId: string,
  data: CreateMeasurementData
): Promise<DocumentMeasurement> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get calibration for this page to calculate measured value
  const calibration = await getScaleCalibration(documentId, data.page_number)

  let measuredValue: number | null = null
  let scaleRatio: number | null = null
  let scaleUnit: string | null = null

  if (calibration) {
    scaleRatio = calibration.pixels_per_unit
    scaleUnit = calibration.unit

    // Calculate measured value based on type
    // Note: actual calculation happens in the UI with page dimensions
    // Here we just store the calibration info
  }

  const { data: measurement, error } = await supabase
    .from('document_measurements')
    .insert({
      document_id: documentId,
      project_id: projectId,
      created_by: user.id,
      type: data.type,
      name: data.name || null,
      page_number: data.page_number,
      points: JSON.stringify(data.points),
      scale_ratio: scaleRatio,
      scale_unit: scaleUnit,
      measured_value: measuredValue,
      color: data.color || 'blue',
      note: data.note || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating measurement:', error)
    throw new Error('Kunde inte skapa mätningen')
  }

  try {
    revalidatePath(`/dashboard/projects/${projectId}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }

  return {
    ...measurement,
    points: data.points
  } as DocumentMeasurement
}

export async function updateMeasurement(
  measurementId: string,
  data: UpdateMeasurementData
): Promise<DocumentMeasurement> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the measurement to verify ownership
  const { data: existing } = await supabase
    .from('document_measurements')
    .select('project_id, created_by')
    .eq('id', measurementId)
    .single()

  if (!existing) {
    throw new Error('Mätningen hittades inte')
  }

  if (existing.created_by !== user.id) {
    throw new Error('Du kan bara redigera dina egna mätningar')
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.color !== undefined) updateData.color = data.color
  if (data.note !== undefined) updateData.note = data.note

  const { data: measurement, error } = await supabase
    .from('document_measurements')
    .update(updateData)
    .eq('id', measurementId)
    .select()
    .single()

  if (error) {
    console.error('Error updating measurement:', error)
    throw new Error('Kunde inte uppdatera mätningen')
  }

  try {
    revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }

  return {
    ...measurement,
    points: typeof measurement.points === 'string'
      ? JSON.parse(measurement.points)
      : measurement.points
  } as DocumentMeasurement
}

export async function updateMeasurementValue(
  measurementId: string,
  measuredValue: number
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('document_measurements')
    .update({
      measured_value: measuredValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', measurementId)

  if (error) {
    console.error('Error updating measurement value:', error)
    throw new Error('Kunde inte uppdatera mätvärdet')
  }
}

export async function deleteMeasurement(measurementId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Get the measurement to verify ownership and get project_id
  const { data: existing } = await supabase
    .from('document_measurements')
    .select('project_id, created_by')
    .eq('id', measurementId)
    .single()

  if (!existing) {
    throw new Error('Mätningen hittades inte')
  }

  if (existing.created_by !== user.id) {
    throw new Error('Du kan bara radera dina egna mätningar')
  }

  const { error } = await supabase
    .from('document_measurements')
    .delete()
    .eq('id', measurementId)

  if (error) {
    console.error('Error deleting measurement:', error)
    throw new Error('Kunde inte radera mätningen')
  }

  try {
    revalidatePath(`/dashboard/projects/${existing.project_id}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }
}

// ===============================
// Scale Calibration Operations
// ===============================

export async function getScaleCalibration(
  documentId: string,
  pageNumber: number
): Promise<ScaleCalibration | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('document_scale_calibrations')
      .select('*')
      .eq('document_id', documentId)
      .eq('page_number', pageNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No calibration found - not an error
        return null
      }
      console.error('Error fetching scale calibration:', error)
      return null
    }

    return data as ScaleCalibration
  } catch (err) {
    console.error('getScaleCalibration unexpected error:', err)
    return null
  }
}

export async function setScaleCalibration(
  documentId: string,
  projectId: string,
  data: CreateCalibrationData
): Promise<ScaleCalibration> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  // Calculate pixels per unit based on the calibration line
  // The actual pixel length will be calculated in the UI with page dimensions
  // For now, we store a reference value that will be adjusted
  const dx = data.point2_x - data.point1_x
  const dy = data.point2_y - data.point1_y
  const percentageLength = Math.sqrt(dx * dx + dy * dy)

  // This is a percentage-based ratio that will be used with actual page dimensions
  const pixelsPerUnit = percentageLength / data.known_distance

  // Use upsert to handle both insert and update
  const { data: calibration, error } = await supabase
    .from('document_scale_calibrations')
    .upsert({
      document_id: documentId,
      page_number: data.page_number,
      created_by: user.id,
      point1_x: data.point1_x,
      point1_y: data.point1_y,
      point2_x: data.point2_x,
      point2_y: data.point2_y,
      known_distance: data.known_distance,
      unit: data.unit,
      pixels_per_unit: pixelsPerUnit,
    }, {
      onConflict: 'document_id,page_number'
    })
    .select()
    .single()

  if (error) {
    console.error('Error setting scale calibration:', error)
    throw new Error('Kunde inte spara kalibreringen')
  }

  try {
    revalidatePath(`/dashboard/projects/${projectId}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }

  return calibration as ScaleCalibration
}

export async function deleteScaleCalibration(
  documentId: string,
  pageNumber: number,
  projectId: string
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Inte inloggad')
  }

  const { error } = await supabase
    .from('document_scale_calibrations')
    .delete()
    .eq('document_id', documentId)
    .eq('page_number', pageNumber)

  if (error) {
    console.error('Error deleting scale calibration:', error)
    throw new Error('Kunde inte radera kalibreringen')
  }

  try {
    revalidatePath(`/dashboard/projects/${projectId}/documents`)
  } catch (e) {
    console.warn('revalidatePath failed:', e)
  }
}

// Note: Calculation helpers (calculatePixelDistance, calculatePixelArea, etc.)
// have been moved to /src/lib/measurementUtils.ts for client-side use
