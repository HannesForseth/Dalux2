import { Metadata } from 'next'
import TermsPage from './TermsPage'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Användarvillkor | Bloxr',
  description: 'Läs Bloxrs användarvillkor för att förstå dina rättigheter och skyldigheter när du använder vår projektportal.',
  keywords: [
    'användarvillkor',
    'villkor',
    'terms of service',
    'bloxr',
    'avtal',
  ],
  openGraph: {
    title: 'Användarvillkor | Bloxr',
    description: 'Läs Bloxrs användarvillkor för att förstå dina rättigheter och skyldigheter.',
    url: 'https://bloxr.se/terms',
    type: 'website',
  },
  alternates: {
    canonical: 'https://bloxr.se/terms',
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
            name: 'Användarvillkor',
            description: 'Bloxrs användarvillkor och tjänsteavtal',
            url: 'https://bloxr.se/terms',
          }),
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Hem', url: 'https://bloxr.se' },
          { name: 'Användarvillkor', url: 'https://bloxr.se/terms' },
        ]}
      />
      <TermsPage />
    </>
  )
}
