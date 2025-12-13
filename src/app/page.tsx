"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Layers,
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  Check,
  Building2,
  Users,
  Shield,
  Zap
} from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">
              Dalux<span className="text-blue-600">2</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
              Funktioner
            </a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
              Priser
            </a>
            <a href="#about" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
              Om oss
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-600">
                Logga in
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                Kom igång
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-100 to-blue-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto relative">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 border-blue-100">
                <Sparkles className="w-4 h-4 mr-2" />
                Nu med AI-assisterad dokumenthantering
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight tracking-tight"
            >
              Projekthantering för{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
                framtidens byggare
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Samla dokument, ritningar och avvikelser på ett ställe.
              Med AI som hjälper dig organisera och hitta det du behöver.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/register">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 transition-all">
                  Starta gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-xl border-slate-200 hover:bg-slate-50">
                  Se demo
                </Button>
              </a>
            </motion.div>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-slate-500 text-sm"
            >
              Ingen kreditkort krävs • Gratis för små projekt
            </motion.p>
          </motion.div>

          {/* Hero Preview */}
          <motion.div
            className="mt-20 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xl shadow-slate-200/50">
              <div className="bg-slate-50 rounded-xl p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PreviewCard
                    icon={<FileText className="w-6 h-6" />}
                    label="Dokument"
                    value="24"
                    trend="+3 denna vecka"
                    color="blue"
                  />
                  <PreviewCard
                    icon={<Layers className="w-6 h-6" />}
                    label="Ritningar"
                    value="12"
                    trend="2 väntar granskning"
                    color="indigo"
                  />
                  <PreviewCard
                    icon={<AlertTriangle className="w-6 h-6" />}
                    label="Avvikelser"
                    value="3"
                    trend="1 åtgärdad idag"
                    color="amber"
                  />
                </div>

                <div className="mt-6 flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">AI-assistent</p>
                      <p className="text-xs text-slate-500">3 nya förslag för dig</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-sm">
                    Visa förslag
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 px-6 border-y border-slate-100 bg-slate-50/50">
        <div className="container mx-auto">
          <p className="text-center text-sm text-slate-500 mb-8">
            Pålitlig för byggföretag över hela Sverige
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            <div className="text-2xl font-bold text-slate-400">Skanska</div>
            <div className="text-2xl font-bold text-slate-400">NCC</div>
            <div className="text-2xl font-bold text-slate-400">PEAB</div>
            <div className="text-2xl font-bold text-slate-400">JM</div>
            <div className="text-2xl font-bold text-slate-400">Veidekke</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4 bg-slate-100 text-slate-700">
              Funktioner
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Allt du behöver för dina byggprojekt
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Kraftfulla verktyg som hjälper dig hålla koll på alla delar av projektet.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Dokumenthantering"
              description="Ladda upp och organisera dokument med AI-assisterad sortering och taggning."
              delay={0}
            />
            <FeatureCard
              icon={<Layers className="w-6 h-6" />}
              title="Ritningsvisare"
              description="Visa PDF-ritningar med markup-verktyg och kommentarer direkt i webbläsaren."
              delay={0.1}
            />
            <FeatureCard
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Avvikelsehantering"
              description="Rapportera och följ upp avvikelser med foton, statusflöde och notifieringar."
              delay={0.2}
            />
            <FeatureCard
              icon={<ClipboardCheck className="w-6 h-6" />}
              title="Checklistor"
              description="Skapa egenkontroller och besiktningsprotokoll med digital signering."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto">
          <motion.div
            className="grid md:grid-cols-2 gap-16 items-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <Badge variant="secondary" className="mb-4 bg-violet-100 text-violet-700">
                <Sparkles className="w-4 h-4 mr-1" />
                AI-driven
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                Låt AI organisera åt dig
              </h2>
              <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                Vår AI hjälper dig automatiskt med att skapa mappstrukturer,
                sortera filer och tagga dokument baserat på innehåll.
                Sök med naturligt språk och hitta det du letar efter direkt.
              </p>
              <ul className="space-y-4">
                {[
                  "Automatisk mappstruktur baserat på projekttyp",
                  "Smart filsortering och kategorisering",
                  "Sök med naturligt språk",
                  "Ritningsanalys och OCR"
                ].map((text, i) => (
                  <motion.li
                    key={i}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-slate-700">{text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-200 to-blue-200 rounded-3xl blur-2xl opacity-40" />
              <Card className="relative bg-white border-slate-200 p-6 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="ml-2 text-sm text-slate-500">AI Assistent</span>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 flex-1">
                      <p className="text-slate-600">Skapar mappstruktur för <span className="text-violet-600 font-semibold">Bostadshus</span>...</p>
                    </div>
                  </div>
                  <div className="pl-11 space-y-2 text-slate-600">
                    <p className="flex items-center gap-2"><span className="text-blue-500">📁</span> 01 - Administration</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500">📁</span> 02 - Ritningar</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500">📁</span> 03 - Beskrivningar</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500">📁</span> 04 - Protokoll</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500">📁</span> 05 - Ekonomi</p>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 mt-4">
                    <Check className="w-5 h-5" />
                    <span>Mappstruktur skapad!</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard number="500+" label="Projekt" icon={<Building2 className="w-5 h-5" />} />
            <StatCard number="10k+" label="Användare" icon={<Users className="w-5 h-5" />} />
            <StatCard number="99.9%" label="Upptid" icon={<Shield className="w-5 h-5" />} />
            <StatCard number="2x" label="Snabbare" icon={<Zap className="w-5 h-5" />} />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-slate-50">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4 bg-slate-100 text-slate-700">
              Priser
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Enkla, transparenta priser
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Betala bara för det du använder. Inga dolda avgifter.
            </p>
          </motion.div>

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
              delay={0}
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
              popular
              delay={0.1}
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
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <motion.div
            className="relative overflow-hidden bg-slate-900 rounded-3xl p-12 md:p-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-600/30 to-violet-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative text-center max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Redo att komma igång?
              </h2>
              <p className="text-slate-300 mb-10 text-lg">
                Skapa ditt konto på under en minut och börja organisera dina byggprojekt idag.
              </p>
              <Link href="/register">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg rounded-xl">
                  Skapa gratis konto
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-slate-100">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">
                  Dalux<span className="text-blue-600">2</span>
                </span>
              </Link>
              <p className="text-slate-500 max-w-sm">
                Modern projekthantering för byggbranschen. Enklare, snabbare, smartare.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Produkt</h4>
              <ul className="space-y-3 text-slate-600">
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Funktioner</a></li>
                <li><a href="#pricing" className="hover:text-slate-900 transition-colors">Priser</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Uppdateringar</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Företag</h4>
              <ul className="space-y-3 text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Om oss</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Kontakt</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Integritetspolicy</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2024 Dalux2. Alla rättigheter förbehållna.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

// Components
function PreviewCard({
  icon,
  label,
  value,
  trend,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend: string
  color: "blue" | "indigo" | "amber"
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600"
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{trend}</p>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  delay
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="p-6 h-full bg-white border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg hover:shadow-slate-200/50 group">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-4 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
      </Card>
    </motion.div>
  )
}

function StatCard({
  number,
  label,
  icon
}: {
  number: string
  label: string
  icon: React.ReactNode
}) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex justify-center mb-2">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          {icon}
        </div>
      </div>
      <p className="text-4xl font-bold text-slate-900">{number}</p>
      <p className="text-slate-600">{label}</p>
    </motion.div>
  )
}

function PricingCard({
  name,
  price,
  description,
  features,
  buttonText,
  popular,
  delay
}: {
  name: string
  price: string
  description: string
  features: string[]
  buttonText: string
  popular?: boolean
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className={`relative p-8 h-full ${popular ? 'border-2 border-blue-600 shadow-xl shadow-blue-100' : 'border-slate-200'}`}>
        {popular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <Badge className="bg-blue-600 text-white px-4 py-1">
              Populärast
            </Badge>
          </div>
        )}
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{name}</h3>
        <p className="text-slate-500 text-sm mb-4">{description}</p>
        <div className="mb-6">
          {price === "Kontakta oss" ? (
            <span className="text-2xl font-bold text-slate-900">{price}</span>
          ) : (
            <>
              <span className="text-4xl font-bold text-slate-900">{price}</span>
              <span className="text-slate-500"> kr/mån</span>
            </>
          )}
        </div>
        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        <Link href="/register">
          <Button
            className={`w-full ${popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
          >
            {buttonText}
          </Button>
        </Link>
      </Card>
    </motion.div>
  )
}
