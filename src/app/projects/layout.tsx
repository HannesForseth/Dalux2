import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mina Projekt | Bloxr',
  description: 'Hantera dina byggprojekt på ett ställe. Se, redigera och skapa nya projekt med Bloxr.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
