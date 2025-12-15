import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Skapa konto - Kom igång gratis',
  description: 'Skapa ett gratis Bloxr-konto och börja hantera dina byggprojekt smartare. Ingen kreditkort krävs. Kom igång på 30 sekunder.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Skapa konto gratis | Bloxr',
    description: 'Kom igång med Bloxr gratis - ingen kreditkort krävs',
    type: 'website',
  },
  alternates: {
    canonical: '/register',
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
