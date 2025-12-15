"use client"

import Link from "next/link"
import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useRef, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import {
  FileText,
  Layers,
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  Check,
  Play,
  FolderOpen,
  AtSign,
  Upload
} from "lucide-react"

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [])
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  return (
    <main className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            top: "-20%",
            right: "-10%",
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)",
            bottom: "10%",
            left: "-5%",
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
            top: "40%",
            left: "30%",
          }}
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="max-w-6xl mx-auto px-6 py-3 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg shadow-black/[0.03]">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/bloxr-logo.png"
                  alt="Bloxr"
                  width={120}
                  height={36}
                  className="h-9 w-auto"
                  priority
                />
              </Link>

              <div className="hidden md:flex items-center gap-1">
                {["Funktioner", "Priser", "Om oss"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    {item}
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {isLoggedIn ? (
                  <Link href="/projects">
                    <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/10">
                      <FolderOpen className="w-4 h-4 mr-1.5" />
                      Mina projekt
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                        Logga in
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/10">
                        Kom igång
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-24 pb-12 px-6">
        <motion.div
          className="max-w-5xl mx-auto text-center relative z-10"
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src="/bloxr-logo.png"
              alt="Bloxr"
              width={280}
              height={80}
              className="h-16 sm:h-20 md:h-24 w-auto mx-auto"
              priority
            />
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            className="mt-8 text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="text-slate-900">Bygg </span>
            <span className="relative">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                smartare
              </span>
              <motion.svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 12"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              >
                <motion.path
                  d="M2 8 Q 50 2, 100 8 T 198 8"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </motion.svg>
            </span>
          </motion.h1>

          <motion.p
            className="mt-8 text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Samla dokument, ritningar och avvikelser på ett ställe.
            <span className="text-slate-900 font-medium"> Med AI som hjälper dig med jobbet.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link href="/register">
              <Button size="lg" className="group bg-slate-900 hover:bg-slate-800 text-white px-8 h-14 text-lg rounded-2xl shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 transition-all hover:-translate-y-0.5">
                Starta gratis
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="group h-14 px-8 text-lg rounded-2xl border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white">
              <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Se demo
            </Button>
          </motion.div>

          <motion.p
            className="mt-6 text-sm text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Gratis för alltid • Ingen kreditkort • Kom igång på 30 sekunder
          </motion.p>
        </motion.div>

        {/* Floating Elements */}
        <FloatingCard
          className="absolute top-[25%] left-[5%] hidden lg:block"
          delay={0}
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-xl shadow-slate-900/5 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">12 uppgifter klara</p>
              <p className="text-xs text-slate-500">Idag</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard
          className="absolute top-[35%] right-[5%] hidden lg:block"
          delay={0.5}
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-xl shadow-slate-900/5 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Ritning uppladdad</p>
              <p className="text-xs text-slate-500">Just nu</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard
          className="absolute bottom-[20%] left-[10%] hidden lg:block"
          delay={1}
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-xl shadow-slate-900/5 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">AI sorterade 24 filer</p>
              <p className="text-xs text-slate-500">Automatiskt</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard
          className="absolute bottom-[25%] right-[8%] hidden lg:block"
          delay={1.5}
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-xl shadow-slate-900/5 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Nytt protokoll</p>
              <p className="text-xs text-slate-500">Byggmöte #14</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard
          className="absolute top-[45%] left-[3%] hidden xl:block"
          delay={2}
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-xl shadow-slate-900/5 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">PM03 uppladdat</p>
              <p className="text-xs text-slate-500">3 min sedan</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard
          className="absolute top-[55%] right-[3%] hidden xl:block"
          delay={2.5}
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-xl shadow-slate-900/5 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
              <AtSign className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Pär taggade dig</p>
              <p className="text-xs text-slate-500">K-ritning Plan 2</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard
          className="absolute bottom-[35%] left-[2%] hidden xl:block"
          delay={3}
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-xl shadow-slate-900/5 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Ny avvikelse</p>
              <p className="text-xs text-slate-500">Hus B, våning 3</p>
            </div>
          </div>
        </FloatingCard>
      </section>

      {/* Bento Grid Features */}
      <section id="funktioner" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
              Funktioner
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Allt på ett ställe
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Kraftfulla verktyg som förenklar hela byggprocessen
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large Card - AI */}
            <motion.div
              className="lg:col-span-2 group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="h-full p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    AI som förstår bygg
                  </h3>
                  <p className="text-white/80 text-lg max-w-md mb-6">
                    Automatisk sortering, smart sökning och förslag baserat på ditt projekt.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Auto-taggning", "Smart sökning", "Mappstruktur", "OCR"].map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Small Card - Documents */}
            <BentoCard
              icon={<FileText className="w-6 h-6" />}
              title="Dokumenthantering"
              description="Ladda upp, organisera och dela dokument enkelt."
              color="blue"
              delay={0.2}
            />

            {/* Small Card - Drawings */}
            <BentoCard
              icon={<Layers className="w-6 h-6" />}
              title="Ritningsvisare"
              description="PDF-ritningar med markup och kommentarer."
              color="violet"
              delay={0.3}
            />

            {/* Small Card - Deviations */}
            <BentoCard
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Avvikelser"
              description="Rapportera och följ upp med foton och status."
              color="amber"
              delay={0.4}
            />

            {/* Small Card - Checklists */}
            <BentoCard
              icon={<ClipboardCheck className="w-6 h-6" />}
              title="Checklistor"
              description="Digitala egenkontroller med signering."
              color="emerald"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="priser" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
              Priser
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Enkelt och transparent
            </h2>
            <p className="text-xl text-slate-600">
              Betala bara för det du använder
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              name="Gratis"
              price="0"
              description="Perfekt för att komma igång"
              features={["1 projekt", "5 GB lagring", "2 användare", "Grundfunktioner"]}
              delay={0}
            />
            <PricingCard
              name="Pro"
              price="199"
              description="För aktiva team"
              features={["Obegränsat projekt", "50 GB lagring", "10 användare", "AI-funktioner", "Prioriterad support"]}
              popular
              delay={0.1}
            />
            <PricingCard
              name="Enterprise"
              price="Kontakta oss"
              description="För stora organisationer"
              features={["Allt i Pro", "Obegränsad lagring", "SSO & API", "Dedikerad support"]}
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-12 md:p-20">
            {/* Animated gradient */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20" />
              <motion.div
                className="absolute w-[500px] h-[500px] rounded-full bg-indigo-500/30 blur-3xl"
                animate={{
                  x: [0, 100, 0],
                  y: [0, -50, 0],
                }}
                transition={{ duration: 10, repeat: Infinity }}
                style={{ top: "-50%", right: "-20%" }}
              />
            </div>

            <div className="relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Redo att bygga smartare?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-xl mx-auto">
                Kom igång gratis på under en minut.
              </p>
              <Link href="/register">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 h-14 px-10 text-lg rounded-2xl shadow-xl">
                  Skapa konto gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/bloxr-logo.png"
                alt="Bloxr"
                width={100}
                height={30}
                className="h-8 w-auto"
              />
            </Link>

            <div className="flex gap-8 text-slate-600">
              <a href="#" className="hover:text-slate-900 transition-colors">Integritetspolicy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Villkor</a>
              <a href="mailto:support@bloxr.se" className="hover:text-slate-900 transition-colors">Kontakt</a>
            </div>

            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Bloxr
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}

// Floating Card Component
function FloatingCard({
  children,
  className,
  delay = 0
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 + delay, duration: 0.6 }}
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 4 + delay,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// Bento Card Component
function BentoCard({
  icon,
  title,
  description,
  color,
  delay
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: "blue" | "violet" | "amber" | "emerald"
  delay: number
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-200",
    violet: "bg-violet-100 text-violet-600 group-hover:bg-violet-200",
    amber: "bg-amber-100 text-amber-600 group-hover:bg-amber-200",
    emerald: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200",
  }

  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      <div className="h-full p-6 bg-white rounded-3xl border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 transition-all cursor-pointer group-hover:-translate-y-1">
        <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-4 transition-colors`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600">{description}</p>
      </div>
    </motion.div>
  )
}

// Pricing Card Component
function PricingCard({
  name,
  price,
  description,
  features,
  popular,
  delay
}: {
  name: string
  price: string
  description: string
  features: string[]
  popular?: boolean
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className={`relative ${popular ? 'md:-mt-4 md:mb-4' : ''}`}
    >
      <div className={`h-full p-8 rounded-3xl ${popular
        ? 'bg-slate-900 text-white ring-2 ring-slate-900'
        : 'bg-white border border-slate-200'
        }`}>
        {popular && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-full">
            Populärast
          </span>
        )}

        <h3 className={`text-xl font-semibold mb-1 ${popular ? 'text-white' : 'text-slate-900'}`}>
          {name}
        </h3>
        <p className={`text-sm mb-4 ${popular ? 'text-slate-400' : 'text-slate-500'}`}>
          {description}
        </p>

        <div className="mb-6">
          {price === "Kontakta oss" ? (
            <span className={`text-2xl font-bold ${popular ? 'text-white' : 'text-slate-900'}`}>
              {price}
            </span>
          ) : (
            <>
              <span className={`text-4xl font-bold ${popular ? 'text-white' : 'text-slate-900'}`}>
                {price}
              </span>
              <span className={popular ? 'text-slate-400' : 'text-slate-500'}> kr/mån</span>
            </>
          )}
        </div>

        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <Check className={`w-5 h-5 flex-shrink-0 ${popular ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={popular ? 'text-slate-300' : 'text-slate-600'}>{feature}</span>
            </li>
          ))}
        </ul>

        <Link href="/register">
          <Button
            className={`w-full h-12 rounded-xl ${popular
              ? 'bg-white text-slate-900 hover:bg-slate-100'
              : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
          >
            {price === "Kontakta oss" ? "Kontakta oss" : "Kom igång"}
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
