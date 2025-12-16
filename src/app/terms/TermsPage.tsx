"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FileText, ArrowLeft } from "lucide-react"

export default function TermsPage() {
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
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900">Användarvillkor</h1>
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
            <h2>1. Inledning och godkännande</h2>
            <p>
              Dessa användarvillkor (&quot;Villkoren&quot;) utgör ett juridiskt bindande avtal mellan dig
              (&quot;Användaren&quot;, &quot;du&quot;) och Bloxr AB, org.nr [Org.nr] (&quot;Bloxr&quot;, &quot;vi&quot;, &quot;oss&quot;)
              avseende din användning av Bloxrs projektportal och tillhörande tjänster (&quot;Tjänsten&quot;).
            </p>
            <p>
              Genom att skapa ett konto, använda Tjänsten eller klicka &quot;Acceptera&quot; bekräftar du att
              du har läst, förstått och accepterar dessa Villkor samt vår{' '}
              <Link href="/privacy-policy">Integritetspolicy</Link>. Om du inte accepterar Villkoren
              får du inte använda Tjänsten.
            </p>

            <h2>2. Beskrivning av Tjänsten</h2>
            <p>
              Bloxr är en molnbaserad projektportal för byggbranschen som erbjuder:
            </p>
            <ul>
              <li>Dokumenthantering och fildelning</li>
              <li>Protokollhantering för möten</li>
              <li>Avvikelsehantering och ärendehantering</li>
              <li>Checklistor och egenkontroller</li>
              <li>RFI (Request for Information)</li>
              <li>AI-assisterade funktioner för dokumentanalys</li>
              <li>Samarbete och kommunikation inom projektteam</li>
            </ul>
            <p>
              Vi förbehåller oss rätten att ändra, uppdatera eller avsluta funktioner i Tjänsten
              utan föregående meddelande, förutsatt att vi inte väsentligt försämrar den
              kärnfunktionalitet du betalar för.
            </p>

            <h2>3. Registrering och konto</h2>

            <h3>3.1 Behörighet</h3>
            <p>
              För att använda Tjänsten måste du vara minst 16 år gammal och ha rättslig
              behörighet att ingå detta avtal. Om du använder Tjänsten på uppdrag av ett
              företag eller organisation garanterar du att du har behörighet att binda
              denna juridiska person till Villkoren.
            </p>

            <h3>3.2 Kontosäkerhet</h3>
            <p>Du ansvarar för att:</p>
            <ul>
              <li>Ange korrekt och fullständig information vid registrering</li>
              <li>Hålla ditt lösenord konfidentiellt</li>
              <li>Omedelbart meddela oss vid obehörig åtkomst till ditt konto</li>
              <li>All aktivitet som sker under ditt konto</li>
            </ul>

            <h2>4. Användning av Tjänsten</h2>

            <h3>4.1 Tillåten användning</h3>
            <p>Du får använda Tjänsten för att:</p>
            <ul>
              <li>Hantera byggprojekt och relaterad dokumentation</li>
              <li>Samarbeta med kollegor och projektpartners</li>
              <li>Lagra och dela projektrelaterade filer inom tillåten kapacitet</li>
            </ul>

            <h3>4.2 Förbjuden användning</h3>
            <p>Du får inte:</p>
            <ul>
              <li>Använda Tjänsten för olagliga ändamål</li>
              <li>Ladda upp skadlig kod, virus eller annat skadligt material</li>
              <li>Försöka få obehörig åtkomst till system eller andra användares konton</li>
              <li>Dela kontouppgifter med obehöriga</li>
              <li>Använda Tjänsten för att skicka spam eller oönskad marknadsföring</li>
              <li>Reproducera, kopiera, sälja eller exploatera Tjänsten kommersiellt</li>
              <li>Försöka reverse-engineera, dekompilera eller plocka isär Tjänsten</li>
              <li>Ladda upp innehåll som kränker andras immateriella rättigheter</li>
              <li>Störa eller överbelasta Tjänstens infrastruktur</li>
            </ul>

            <h2>5. Planer och betalning</h2>

            <h3>5.1 Prenumerationsplaner</h3>
            <p>
              Tjänsten erbjuds i olika prenumerationsplaner med varierande funktionalitet,
              lagringsutrymme och antal användare. Aktuella planer och priser finns på vår
              webbplats och i Tjänsten.
            </p>

            <h3>5.2 Gratis plan</h3>
            <p>
              Vi erbjuder en gratis plan med begränsad funktionalitet. Gratis användare
              accepterar att vi kan:
            </p>
            <ul>
              <li>Ändra eller begränsa gratisplanens funktioner när som helst</li>
              <li>Radera inaktiva gratiskonton efter 12 månaders inaktivitet</li>
            </ul>

            <h3>5.3 Betalning</h3>
            <p>
              Betalda prenumerationer faktureras månadsvis i förskott via Stripe. Genom att
              uppge betalningsinformation godkänner du att vi debiterar vald betalningsmetod.
            </p>
            <ul>
              <li>Priser anges exklusive moms om inte annat anges</li>
              <li>Vi förbehåller oss rätten att ändra priser med 30 dagars varsel</li>
              <li>Prisändringar träder i kraft vid nästa faktureringsperiod</li>
            </ul>

            <h3>5.4 Återbetalning</h3>
            <p>
              Betalningar för prenumerationer återbetalas inte, utom enligt gällande
              konsumenträttslagstiftning eller efter Bloxrs eget gottfinnande vid allvarliga
              tekniska fel som vi inte kan åtgärda.
            </p>

            <h2>6. Äganderätt och licenser</h2>

            <h3>6.1 Bloxrs immateriella rättigheter</h3>
            <p>
              Tjänsten, inklusive mjukvara, design, logotyper, varumärken och all
              dokumentation, ägs av eller licensieras till Bloxr. Inget i dessa Villkor
              överför äganderätt till dig.
            </p>

            <h3>6.2 Ditt innehåll</h3>
            <p>
              Du behåller full äganderätt till allt innehåll du laddar upp till Tjänsten
              (&quot;Ditt Innehåll&quot;). Genom att ladda upp innehåll ger du Bloxr en
              icke-exklusiv, världsomspännande licens att:
            </p>
            <ul>
              <li>Lagra, bearbeta och visa Ditt Innehåll för att tillhandahålla Tjänsten</li>
              <li>Skapa säkerhetskopior</li>
              <li>Dela med andra användare enligt dina delningsinställningar</li>
            </ul>
            <p>
              Denna licens upphör när du raderar Ditt Innehåll eller avslutar ditt konto,
              förutom för eventuella säkerhetskopior enligt vår datalagringspolicy.
            </p>

            <h3>6.3 AI-funktioner</h3>
            <p>
              När du använder våra AI-funktioner (dokumentanalys, sammanfattningar m.m.)
              skickas data till tredjepartsleverantörer. Vi garanterar att:
            </p>
            <ul>
              <li>Din data används inte för att träna AI-modeller</li>
              <li>AI-genererat innehåll tillhör dig</li>
              <li>Vi ansvarar inte för riktigheten i AI-genererade resultat</li>
            </ul>

            <h2>7. Ansvarsbegränsning</h2>

            <h3>7.1 Tjänsten tillhandahålls &quot;som den är&quot;</h3>
            <p>
              Vi strävar efter hög tillgänglighet och kvalitet men kan inte garantera att
              Tjänsten alltid är felfri, tillgänglig eller säker. Tjänsten tillhandahålls
              utan uttryckliga eller underförstådda garantier.
            </p>

            <h3>7.2 Ansvarsbegränsning</h3>
            <p>
              I den utsträckning tillämplig lag tillåter ansvarar Bloxr inte för:
            </p>
            <ul>
              <li>Indirekta skador, följdskador eller utebliven vinst</li>
              <li>Förlust av data (utöver vad som täcks av våra säkerhetskopior)</li>
              <li>Avbrott i verksamhet</li>
              <li>Handlingar eller innehåll från andra användare</li>
            </ul>
            <p>
              Vårt totala ansvar begränsas till det belopp du betalat för Tjänsten under
              de senaste 12 månaderna.
            </p>

            <h3>7.3 Undantag</h3>
            <p>
              Ansvarsbegränsningarna gäller inte vid grov vårdslöshet eller uppsåt från
              Bloxrs sida, eller där begränsningen är ogiltig enligt tvingande lagstiftning.
            </p>

            <h2>8. Uppsägning</h2>

            <h3>8.1 Din rätt att säga upp</h3>
            <p>
              Du kan när som helst avsluta ditt konto via inställningarna i Tjänsten.
              Vid uppsägning:
            </p>
            <ul>
              <li>Betalda prenumerationer fortsätter till periodens slut</li>
              <li>Du kan exportera Ditt Innehåll innan kontot stängs</li>
              <li>Data raderas enligt vår Integritetspolicy</li>
            </ul>

            <h3>8.2 Vår rätt att säga upp</h3>
            <p>Vi kan stänga av eller avsluta ditt konto om du:</p>
            <ul>
              <li>Bryter mot dessa Villkor</li>
              <li>Inte betalar trots påminnelser</li>
              <li>Använder Tjänsten för olaglig verksamhet</li>
              <li>Skadar Tjänsten eller andra användare</li>
            </ul>
            <p>
              Vid allvarliga överträdelser kan vi stänga av kontot omedelbart. I andra
              fall ges minst 14 dagars varsel.
            </p>

            <h2>9. Ändringar av Villkoren</h2>
            <p>
              Vi kan uppdatera dessa Villkor. Vid väsentliga ändringar meddelar vi dig
              minst 30 dagar i förväg via e-post och/eller meddelande i Tjänsten.
              Fortsatt användning efter ändringarna innebär att du accepterar de nya
              Villkoren.
            </p>

            <h2>10. Tillämplig lag och tvister</h2>
            <p>
              Dessa Villkor regleras av svensk lag. Tvister ska i första hand lösas
              genom förhandling. Om förhandling misslyckas ska tvisten avgöras av
              svensk allmän domstol med Stockholms tingsrätt som första instans.
            </p>
            <p>
              För konsumenter gäller att du alltid kan vända dig till Allmänna
              reklamationsnämnden (ARN) för tvister upp till 500 000 kr.
            </p>

            <h2>11. Force majeure</h2>
            <p>
              Bloxr ansvarar inte för förseningar eller fel i Tjänsten orsakade av
              omständigheter utanför vår rimliga kontroll, såsom naturkatastrofer,
              krig, strejk, lagändringar, eller störningar i internet eller
              tredjepartstjänster.
            </p>

            <h2>12. Övriga bestämmelser</h2>
            <p>
              Om någon bestämmelse i dessa Villkor anses ogiltig ska övriga
              bestämmelser fortsätta gälla. Vår underlåtenhet att utöva en rättighet
              innebär inte att vi avstår från den. Dessa Villkor utgör hela avtalet
              mellan dig och Bloxr avseende Tjänsten.
            </p>

            <h2>13. Kontakt</h2>
            <p>
              För frågor om dessa Villkor eller Tjänsten, kontakta oss:
            </p>
            <p>
              <strong>Bloxr AB</strong><br />
              E-post: <a href="mailto:support@bloxr.se">support@bloxr.se</a><br />
              Juridiska frågor: <a href="mailto:legal@bloxr.se">legal@bloxr.se</a>
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
            <Link href="/privacy-policy" className="hover:text-slate-900 transition-colors">Integritetspolicy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors font-medium text-purple-600">Användarvillkor</Link>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Bloxr. Alla rättigheter förbehållna.
          </p>
        </div>
      </footer>
    </main>
  )
}
