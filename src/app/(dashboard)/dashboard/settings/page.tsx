import { redirect } from 'next/navigation'

// Redirect /dashboard/settings to /dashboard/profile
// Settings are now handled per-project at /dashboard/projects/[id]/settings
export default function SettingsRedirect() {
  redirect('/dashboard/profile')
}
