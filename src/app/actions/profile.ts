'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Profile } from '@/types/database'

export interface ProfileUpdateData {
  full_name?: string | null
  company?: string | null
  phone?: string | null
  avatar_url?: string | null
}

/**
 * Get the current user's profile
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

/**
 * Update the current user's profile
 */
export async function updateProfile(data: ProfileUpdateData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Inte inloggad' }
  }

  const updateData: ProfileUpdateData & { updated_at: string } = {
    ...data,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: 'Kunde inte uppdatera profil' }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/settings')

  return { success: true }
}

/**
 * Upload avatar image and update profile
 */
export async function uploadAvatar(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Inte inloggad' }
  }

  const file = formData.get('avatar') as File
  if (!file) {
    return { success: false, error: 'Ingen fil vald' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Endast bilder (JPG, PNG, GIF, WebP) är tillåtna' }
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    return { success: false, error: 'Bilden får vara max 2 MB' }
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${Date.now()}.${fileExt}`
  const filePath = `avatars/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    return { success: false, error: 'Kunde inte ladda upp bild' }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  const avatarUrl = urlData.publicUrl

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('Error updating avatar URL:', updateError)
    return { success: false, error: 'Kunde inte uppdatera profilbild' }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/settings')

  return { success: true, url: avatarUrl }
}

/**
 * Delete avatar and reset to default
 */
export async function deleteAvatar(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Inte inloggad' }
  }

  // Get current avatar URL to delete from storage
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single()

  if (profile?.avatar_url) {
    // Extract file path from URL
    const url = new URL(profile.avatar_url)
    const pathMatch = url.pathname.match(/\/avatars\/(.+)$/)
    if (pathMatch) {
      const filePath = `avatars/${pathMatch[1]}`
      await supabase.storage.from('avatars').remove([filePath])
    }
  }

  // Clear avatar URL in profile
  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error clearing avatar:', error)
    return { success: false, error: 'Kunde inte ta bort profilbild' }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/settings')

  return { success: true }
}
