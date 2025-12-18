import { Metadata } from 'next'
import PrivacyPolicyPage from './PrivacyPolicyPage'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Integritetspolicy | Bloxr',
  description: 'Läs om hur Bloxr samlar in, använder och skyddar dina personuppgifter. Vi värnar om din integritet och följer GDPR.',
  keywords: [
    'integritetspolicy',
    'GDPR',
    'dataskydd',
    'personuppgifter',
    'bloxr',
    'privacy policy',
  ],
  openGraph: {
    title: 'Integritetspolicy | Bloxr',
    description: 'Läs om hur Bloxr samlar in, använder och skyddar dina personuppgifter.',
    url: 'https://bloxr.se/privacy-policy',
    type: 'website',
  },
  alternates: {
    canonical: 'https://bloxr.se/privacy-policy',
  },
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Integritetspolicy',
            description: 'Bloxrs integritetspolicy och hantering av personuppgifter',
            url: 'https://bloxr.se/privacy-policy',
          }),
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Hem', url: 'https://bloxr.se' },
          { name: 'Integritetspolicy', url: 'https://bloxr.se/privacy-policy' },
        ]}
      />
      <PrivacyPolicyPage />
    </>
  )
}
