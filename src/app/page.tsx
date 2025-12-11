import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white">
            Dalux<span className="text-blue-500">2</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors">Funktioner</a>
            <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">Priser</a>
            <a href="#about" className="text-slate-400 hover:text-white transition-colors">Om oss</a>
          </div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Logga in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Kom igång
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Nu med AI-assisterad dokumenthantering
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Projekthantering för{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                framtidens byggare
              </span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Samla dokument, ritningar och avvikelser på ett ställe.
              Med AI som hjälper dig organisera och hitta det du behöver.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/25"
              >
                Starta gratis
              </Link>
              <a
                href="#demo"
                className="px-8 py-4 bg-slate-800 text-white rounded-xl text-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Se demo
              </a>
            </div>

            <p className="mt-6 text-slate-500 text-sm">
              Ingen kreditkort krävs. Gratis för små projekt.
            </p>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-2 shadow-2xl shadow-blue-500/5">
              <div className="bg-slate-950 rounded-xl p-6 min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="text-3xl mb-2">📁</div>
                      <div className="text-slate-400 text-sm">24 dokument</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="text-3xl mb-2">📐</div>
                      <div className="text-slate-400 text-sm">12 ritningar</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="text-3xl mb-2">⚠️</div>
                      <div className="text-slate-400 text-sm">3 avvikelser</div>
                    </div>
                  </div>
                  <p className="text-slate-500">Dashboard preview kommer snart</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-900/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Allt du behöver för dina byggprojekt
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Kraftfulla verktyg som hjälper dig hålla koll på alla delar av projektet.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<DocumentIcon />}
              title="Dokumenthantering"
              description="Ladda upp och organisera dokument med AI-assisterad sortering och taggning."
            />
            <FeatureCard
              icon={<BlueprintIcon />}
              title="Ritningsvisare"
              description="Visa PDF-ritningar med markup-verktyg och kommentarer direkt i webbläsaren."
            />
            <FeatureCard
              icon={<AlertIcon />}
              title="Avvikelsehantering"
              description="Rapportera och följ upp avvikelser med foton, statusflöde och notifieringar."
            />
            <FeatureCard
              icon={<ChecklistIcon />}
              title="Checklistor"
              description="Skapa egenkontroller och besiktningsprotokoll med digital signering."
            />
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-3xl border border-blue-500/20 p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
                  AI-driven
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  Låt AI organisera åt dig
                </h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Vår AI hjälper dig automatiskt med att skapa mappstrukturer,
                  sortera filer och tagga dokument baserat på innehåll.
                  Sök med naturligt språk och hitta det du letar efter direkt.
                </p>
                <ul className="space-y-4">
                  <AIFeature text="Automatisk mappstruktur baserat på projekttyp" />
                  <AIFeature text="Smart filsortering och kategorisering" />
                  <AIFeature text="Sök med naturligt språk" />
                  <AIFeature text="Ritningsanalys och OCR" />
                </ul>
              </div>
              <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-700">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <p className="text-slate-500">// AI skapar mappstruktur</p>
                  <p className="text-blue-400">Projekttyp: <span className="text-white">Bostadshus</span></p>
                  <div className="pl-4 border-l-2 border-slate-700 space-y-1 text-slate-300">
                    <p>📁 01 - Administration</p>
                    <p>📁 02 - Ritningar</p>
                    <p>📁 03 - Beskrivningar</p>
                    <p>📁 04 - Protokoll</p>
                    <p>📁 05 - Ekonomi</p>
                  </div>
                  <p className="text-green-400 mt-4">✓ Mappstruktur skapad</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-slate-900/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Enkla, transparenta priser
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Betala bara för det du använder. Inga dolda avgifter.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Gratis"
              price="0"
              description="För små projekt och tester"
              features={[
                "1 projekt",
                "5 GB lagring",
                "2 användare",
                "Grundläggande funktioner"
              ]}
              buttonText="Kom igång"
              buttonVariant="secondary"
            />
            <PricingCard
              name="Pro"
              price="199"
              description="För aktiva projekt"
              features={[
                "Obegränsat antal projekt",
                "50 GB lagring",
                "10 användare",
                "AI-funktioner",
                "Prioriterad support"
              ]}
              buttonText="Starta provperiod"
              buttonVariant="primary"
              popular
            />
            <PricingCard
              name="Enterprise"
              price="Kontakta oss"
              description="För stora organisationer"
              features={[
                "Allt i Pro",
                "Obegränsad lagring",
                "Obegränsat antal användare",
                "SSO & API-åtkomst",
                "Dedikerad support"
              ]}
              buttonText="Kontakta oss"
              buttonVariant="secondary"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Redo att komma igång?
            </h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
              Skapa ditt konto på under en minut och börja organisera dina byggprojekt idag.
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-4 bg-white text-blue-600 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Skapa gratis konto
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold text-white">
              Dalux<span className="text-blue-500">2</span>
            </div>
            <div className="flex gap-8 text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Integritetspolicy</a>
              <a href="#" className="hover:text-white transition-colors">Villkor</a>
              <a href="#" className="hover:text-white transition-colors">Kontakt</a>
            </div>
            <p className="text-slate-500 text-sm">
              © 2024 Dalux2. Alla rättigheter förbehållna.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-blue-500/5 group">
      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 group-hover:bg-blue-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function AIFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-slate-300">
      <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {text}
    </li>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  buttonText,
  buttonVariant,
  popular,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: "primary" | "secondary";
  popular?: boolean;
}) {
  return (
    <div className={`relative p-8 rounded-2xl border ${popular ? 'bg-slate-900 border-blue-500' : 'bg-slate-900/50 border-slate-800'}`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-medium rounded-full">
          Populärast
        </div>
      )}
      <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      <div className="mb-6">
        {price === "Kontakta oss" ? (
          <span className="text-2xl font-bold text-white">{price}</span>
        ) : (
          <>
            <span className="text-4xl font-bold text-white">{price}</span>
            <span className="text-slate-400"> kr/mån</span>
          </>
        )}
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`block text-center w-full py-3 rounded-xl font-semibold transition-colors ${
          buttonVariant === "primary"
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
        }`}
      >
        {buttonText}
      </Link>
    </div>
  );
}

// Icons
function DocumentIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function BlueprintIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}
