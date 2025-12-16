"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Shield, Mail, ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/bloxr-icon.png"
              alt="Bloxr"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Bloxr
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
              Hem
            </Link>
            <Link href="/om-oss" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
              Om oss
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Logga in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                Kom igång
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Tillbaka till startsidan
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900">Integritetspolicy</h1>
            </div>
            <p className="text-slate-600">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 px-6">
        <motion.div
          className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="prose prose-slate max-w-none">
            <h2>1. Introduktion</h2>
            <p>
              Bloxr AB (&quot;vi&quot;, &quot;oss&quot;, &quot;vår&quot;) värnar om din personliga integritet. Denna
              integritetspolicy förklarar hur vi samlar in, använder, lagrar och skyddar dina
              personuppgifter när du använder vår tjänst på bloxr.se (&quot;Tjänsten&quot;).
            </p>
            <p>
              Vi behandlar personuppgifter i enlighet med EU:s allmänna dataskyddsförordning (GDPR)
              och tillämpldig svensk lagstiftning.
            </p>

            <h2>2. Personuppgiftsansvarig</h2>
            <p>
              <strong>Bloxr AB</strong><br />
              Organisationsnummer: [Org.nr]<br />
              E-post: <a href="mailto:privacy@bloxr.se">privacy@bloxr.se</a>
            </p>

            <h2>3. Vilka uppgifter vi samlar in</h2>
            <p>Vi samlar in följande kategorier av personuppgifter:</p>

            <h3>3.1 Uppgifter du lämnar till oss</h3>
            <ul>
              <li><strong>Kontouppgifter:</strong> Namn, e-postadress och lösenord när du registrerar ett konto</li>
              <li><strong>Profilinformation:</strong> Eventuell profilbild och telefonnummer som du väljer att lägga till</li>
              <li><strong>Betalningsuppgifter:</strong> Faktureringsadress och betalningsinformation (kortuppgifter hanteras av Stripe)</li>
              <li><strong>Projektdata:</strong> Information du laddar upp eller skapar i Tjänsten (dokument, protokoll, avvikelser m.m.)</li>
              <li><strong>Kommunikation:</strong> Meddelanden, kommentarer och @omnämnanden inom projekt</li>
            </ul>

            <h3>3.2 Automatiskt insamlade uppgifter</h3>
            <ul>
              <li><strong>Teknisk information:</strong> IP-adress, webbläsartyp, operativsystem och enhetsinformation</li>
              <li><strong>Användningsdata:</strong> Hur du interagerar med Tjänsten, vilka funktioner du använder</li>
              <li><strong>Cookies:</strong> Se vår cookiepolicy nedan</li>
            </ul>

            <h2>4. Hur vi använder dina uppgifter</h2>
            <p>Vi använder dina personuppgifter för att:</p>
            <ul>
              <li>Tillhandahålla, underhålla och förbättra Tjänsten</li>
              <li>Skapa och hantera ditt konto</li>
              <li>Behandla betalningar och fakturering</li>
              <li>Skicka viktiga meddelanden om Tjänsten (servicemeddelanden, säkerhetsvarningar)</li>
              <li>Skicka notiser om aktivitet i projekt du deltar i (om du godkänt detta)</li>
              <li>Ge kundsupport och svara på frågor</li>
              <li>Analysera användningsmönster för att förbättra Tjänsten</li>
              <li>Förebygga bedrägerier och skydda säkerheten</li>
              <li>Uppfylla rättsliga skyldigheter</li>
            </ul>

            <h2>5. Rättslig grund för behandling</h2>
            <p>Vi behandlar dina personuppgifter baserat på följande rättsliga grunder:</p>
            <ul>
              <li><strong>Avtal:</strong> För att fullgöra vårt avtal med dig (tillhandahålla Tjänsten)</li>
              <li><strong>Berättigat intresse:</strong> För att förbättra Tjänsten och förebygga missbruk</li>
              <li><strong>Rättslig förpliktelse:</strong> För att uppfylla bokföringskrav och andra lagkrav</li>
              <li><strong>Samtycke:</strong> För marknadsföringsutskick (du kan när som helst återkalla ditt samtycke)</li>
            </ul>

            <h2>6. Delning av uppgifter</h2>
            <p>Vi delar dina personuppgifter med:</p>
            <ul>
              <li><strong>Projektmedlemmar:</strong> Andra användare i projekt du deltar i kan se din profilinformation och aktivitet</li>
              <li><strong>Tjänsteleverantörer:</strong> Vi använder följande underleverantörer:
                <ul>
                  <li><strong>Supabase:</strong> Databashantering och autentisering (USA, med EU-databehandling)</li>
                  <li><strong>Stripe:</strong> Betalningshantering (USA, certifierad under Privacy Shield)</li>
                  <li><strong>Vercel:</strong> Webbhotell (USA/EU)</li>
                  <li><strong>Resend:</strong> E-postutskick</li>
                  <li><strong>Anthropic:</strong> AI-funktioner (data skickas inte för modellträning)</li>
                </ul>
              </li>
              <li><strong>Myndigheter:</strong> Vid lagstadgad skyldighet eller vid misstanke om brott</li>
            </ul>
            <p>Vi säljer aldrig dina personuppgifter till tredje part.</p>

            <h2>7. Internationella överföringar</h2>
            <p>
              Vissa av våra tjänsteleverantörer är baserade utanför EU/EES. Vid överföring av
              personuppgifter till länder utanför EU/EES säkerställer vi att adekvat skyddsnivå
              upprätthålls genom:
            </p>
            <ul>
              <li>EU-kommissionens standardavtalsklausuler</li>
              <li>Leverantörens certifiering under EU-US Data Privacy Framework</li>
            </ul>

            <h2>8. Hur länge vi sparar uppgifter</h2>
            <ul>
              <li><strong>Kontouppgifter:</strong> Så länge du har ett aktivt konto, plus 12 månader efter avslut</li>
              <li><strong>Projektdata:</strong> Så länge projektet är aktivt, plus enligt avtal med projektägaren</li>
              <li><strong>Betalningshistorik:</strong> 7 år enligt bokföringslagen</li>
              <li><strong>Supportärenden:</strong> 2 år efter ärendets avslut</li>
              <li><strong>Loggfiler:</strong> 90 dagar</li>
            </ul>

            <h2>9. Dina rättigheter</h2>
            <p>Enligt GDPR har du följande rättigheter:</p>
            <ul>
              <li><strong>Rätt till tillgång:</strong> Få information om vilka uppgifter vi har om dig</li>
              <li><strong>Rätt till rättelse:</strong> Korrigera felaktiga uppgifter</li>
              <li><strong>Rätt till radering:</strong> Begära att vi raderar dina uppgifter (&quot;rätten att bli bortglömd&quot;)</li>
              <li><strong>Rätt till begränsning:</strong> Begränsa behandlingen av dina uppgifter</li>
              <li><strong>Rätt till dataportabilitet:</strong> Få ut dina uppgifter i ett maskinläsbart format</li>
              <li><strong>Rätt att göra invändningar:</strong> Invända mot behandling baserad på berättigat intresse</li>
              <li><strong>Rätt att återkalla samtycke:</strong> När som helst återkalla samtycke</li>
            </ul>
            <p>
              För att utöva dina rättigheter, kontakta oss på{' '}
              <a href="mailto:privacy@bloxr.se">privacy@bloxr.se</a>. Vi svarar inom 30 dagar.
            </p>

            <h2>10. Cookies</h2>
            <p>Vi använder cookies för att:</p>
            <ul>
              <li><strong>Nödvändiga cookies:</strong> Hålla dig inloggad och komma ihåg dina preferenser</li>
              <li><strong>Analyscookies:</strong> Förstå hur Tjänsten används (med ditt samtycke)</li>
            </ul>
            <p>
              Du kan hantera cookies i din webbläsares inställningar. Observera att blockering
              av nödvändiga cookies kan påverka Tjänstens funktionalitet.
            </p>

            <h2>11. Säkerhet</h2>
            <p>Vi skyddar dina uppgifter genom:</p>
            <ul>
              <li>Kryptering vid överföring (TLS/SSL)</li>
              <li>Krypterad lagring av känsliga uppgifter</li>
              <li>Regelbundna säkerhetskopior</li>
              <li>Behörighetskontroller och rollbaserad åtkomst</li>
              <li>Regelbundna säkerhetsgranskningar</li>
            </ul>

            <h2>12. Barns integritet</h2>
            <p>
              Tjänsten är inte avsedd för personer under 16 år. Vi samlar inte medvetet in
              personuppgifter från barn under 16 år. Om du är förälder och upptäcker att ditt
              barn har lämnat uppgifter till oss, kontakta oss så raderar vi uppgifterna.
            </p>

            <h2>13. Ändringar i policyn</h2>
            <p>
              Vi kan uppdatera denna policy vid behov. Vid väsentliga ändringar meddelar vi dig
              via e-post eller genom ett meddelande i Tjänsten. Fortsatt användning efter ändringar
              innebär att du accepterar den uppdaterade policyn.
            </p>

            <h2>14. Klagomål</h2>
            <p>
              Om du är missnöjd med hur vi hanterar dina personuppgifter har du rätt att lämna
              klagomål till:
            </p>
            <p>
              <strong>Integritetsskyddsmyndigheten (IMY)</strong><br />
              Box 8114<br />
              104 20 Stockholm<br />
              <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">www.imy.se</a>
            </p>

            <h2>15. Kontakt</h2>
            <p>
              Har du frågor om denna integritetspolicy eller hur vi hanterar dina uppgifter?
              Kontakta oss:
            </p>
            <p>
              <strong>E-post:</strong> <a href="mailto:privacy@bloxr.se">privacy@bloxr.se</a><br />
              <strong>Allmänna frågor:</strong> <a href="mailto:support@bloxr.se">support@bloxr.se</a>
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/bloxr-icon.png"
              alt="Bloxr"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="font-semibold text-slate-900">Bloxr</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900 transition-colors">Hem</Link>
            <Link href="/om-oss" className="hover:text-slate-900 transition-colors">Om oss</Link>
            <Link href="/privacy-policy" className="hover:text-slate-900 transition-colors font-medium text-indigo-600">Integritetspolicy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Användarvillkor</Link>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Bloxr. Alla rättigheter förbehållna.
          </p>
        </div>
      </footer>
    </main>
  )
}
