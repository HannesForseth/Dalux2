import { Metadata } from 'next'
import AboutPage from './AboutPage'
import { OrganizationJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Om Oss - Vår Historia & Vision | Bloxr',
  description: 'Bloxr startades som ett prisvärt alternativ till dyra projektportaler. Läs om vår vision att demokratisera projekthantering med AI-drivna verktyg för byggbranschen.',
  keywords: [
    'om bloxr',
    'projekthantering startup',
    'byggbranschens digitalisering',
    'AI projektverktyg',
    'dalux alternativ',
    'prisvärd projektportal',
    'svensk proptech',
    'byggprojekt digitalisering',
  ],
  openGraph: {
    title: 'Om Oss - Bloxr | Framtidens Projekthantering',
    description: 'Vi startade Bloxr för att göra professionell projekthantering tillgänglig för alla. Läs vår historia och vision för byggbranschens framtid.',
    url: 'https://bloxr.se/om-oss',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Bloxr - Om Oss',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Om Oss - Bloxr',
    description: 'Vi startade Bloxr för att göra professionell projekthantering tillgänglig för alla.',
  },
  alternates: {
    canonical: 'https://bloxr.se/om-oss',
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
            '@type': 'AboutPage',
            name: 'Om Bloxr',
            description: 'Information om Bloxr och vår vision för projekthantering',
            url: 'https://bloxr.se/om-oss',
            mainEntity: {
              '@type': 'Organization',
              name: 'Bloxr',
              description: 'Bloxr erbjuder en modern, prisvärd projektportal för byggbranschen med AI-drivna verktyg.',
              foundingDate: '2024',
              founders: [
                {
                  '@type': 'Person',
                  name: 'Hannes Forseth',
                }
              ],
              knowsAbout: [
                'Projekthantering',
                'Byggbranschen',
                'AI',
                'Digitalisering',
              ],
            },
          }),
        }}
      />
      <OrganizationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: 'Hem', url: 'https://bloxr.se' },
          { name: 'Om Oss', url: 'https://bloxr.se/om-oss' },
        ]}
      />
      <AboutPage />
    </>
  )
}
