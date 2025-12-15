import { Metadata } from 'next'
import DashboardLayoutClient from './DashboardLayoutClient'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | Bloxr Dashboard',
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
