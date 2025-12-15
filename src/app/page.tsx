import { Metadata } from 'next'
import HomePage from './HomePage'
import {
  OrganizationJsonLd,
  WebsiteJsonLd,
  SoftwareApplicationJsonLd,
  FAQJsonLd,
} from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Bloxr - Bygg smartare | Projektportal för byggbranschen',
  description: 'Samla dokument, ritningar och avvikelser på ett ställe. AI-driven projektportal för byggprojekt. Gratis att börja - ingen kreditkort krävs.',
  keywords: [
    'byggprojekt programvara',
    'projektportal bygg',
    'dokumenthantering byggprojekt',
    'digitala checklistor bygg',
    'avvikelsehantering',
    'ritningshantering',
    'BIM',
    'byggdokumentation',
    'egenkontroll bygg',
    'mötesprotokoll bygg',
  ],
  openGraph: {
    title: 'Bloxr - Bygg smartare',
    description: 'Den moderna projektportalen för byggprojekt med AI-assistans',
    type: 'website',
    url: '/',
  },
  alternates: {
    canonical: '/',
  },
}

const faqQuestions = [
  {
    question: "Vad är Bloxr?",
    answer: "Bloxr är en modern projektportal för byggbranschen som samlar dokument, ritningar och avvikelser på ett ställe med AI-assistans. Perfekt för byggprojekt av alla storlekar.",
  },
  {
    question: "Är Bloxr gratis?",
    answer: "Ja, Bloxr har en gratis plan som inkluderar 1 projekt, 5 GB lagring och 2 användare. Ingen kreditkort krävs för att komma igång.",
  },
  {
    question: "Vilka funktioner ingår i Bloxr?",
    answer: "Bloxr inkluderar dokumenthantering, ritningsvisare med mätverktyg, avvikelsehantering, digitala checklistor, mötesprotokoll, RFI-hantering och AI-driven automatisering.",
  },
  {
    question: "Hur skiljer sig Bloxr från andra projektportaler?",
    answer: "Bloxr är byggt specifikt för svenska byggföretag med fokus på användarvänlighet, prisvärdhet och modern AI-teknologi. Vi har också fullt stöd för svenska standarder och krav.",
  },
  {
    question: "Kan jag prova Bloxr innan jag köper?",
    answer: "Absolut! Du kan skapa ett gratis konto och använda Bloxr utan begränsningar i vår gratisplan. Uppgradera när du känner dig redo.",
  },
]

export default function Page() {
  return (
    <>
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <SoftwareApplicationJsonLd />
      <FAQJsonLd questions={faqQuestions} />
      <HomePage />
    </>
  )
}
