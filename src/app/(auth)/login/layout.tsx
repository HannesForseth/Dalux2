import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Logga in',
  description: 'Logga in på ditt Bloxr-konto för att hantera dina byggprojekt. Säker inloggning med e-post och lösenord.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Logga in | Bloxr',
    description: 'Logga in på ditt Bloxr-konto för att hantera dina byggprojekt',
    type: 'website',
  },
  alternates: {
    canonical: '/login',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
