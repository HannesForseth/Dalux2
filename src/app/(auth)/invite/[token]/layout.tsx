import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Projektinbjudan',
  description: 'Du har blivit inbjuden att gå med i ett byggprojekt på Bloxr.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children
}
