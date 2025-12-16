"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  ArrowRight,
  Target,
  Heart,
  Zap,
  Users,
  TrendingUp,
  Building2,
  Brain,
  Rocket,
  Shield,
  Clock
} from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function AboutPage() {
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
            top: "50%",
            left: "40%",
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
            <Link href="/om-oss" className="text-indigo-600 font-medium text-sm">
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

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-6">
              <Heart className="w-4 h-4" />
              Vår historia
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Vi byggde det vi{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              själva saknade
            </span>
          </motion.h1>

          <motion.p
            className="text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Bloxr startades ur frustration. Vi var trötta på att betala tusentals kronor
            per månad för projektportaler som var överdrivet komplexa och långsamma.
          </motion.p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Varför vi startade{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Bloxr
                </span>
              </h2>

              <div className="space-y-6 text-slate-600 leading-relaxed">
                <p>
                  Som entreprenörer och projektledare i byggbranschen stötte vi ständigt på samma problem:
                  professionella projektportaler kostade en förmögenhet. Priser på <strong>10 000–50 000 kr per månad</strong>
                  var vanliga, vilket gjorde dem otillgängliga för mindre företag och enskilda projektörer.
                </p>

                <p>
                  Samtidigt såg vi hur branschen digitaliserades i rasande takt, men verktygen hängde inte med.
                  De var byggda för stora organisationer med IT-avdelningar, inte för hantverkare eller små
                  entreprenörer som bara ville ha något som <strong>fungerade</strong>.
                </p>

                <p>
                  Så vi bestämde oss: <em>Varför inte bygga det själva?</em> En projektportal som är lika
                  kraftfull som de dyra alternativen, men till en bråkdel av priset. Enkel att använda.
                  Modern. Och med AI som faktiskt hjälper dig i vardagen.
                </p>
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-1">
                <div className="bg-white rounded-3xl p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Problemet</h3>
                      <p className="text-slate-600 text-sm">
                        Dyra och komplexa projektportaler utestänger mindre aktörer från digital projekthantering.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Target className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Insikten</h3>
                      <p className="text-slate-600 text-sm">
                        Modern teknik och AI gör det möjligt att bygga bättre verktyg till lägre kostnad.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Lösningen</h3>
                      <p className="text-slate-600 text-sm">
                        Bloxr – en komplett projektportal med alla nödvändiga funktioner till en rättvis prissättning.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Vision Section */}
      <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-500/10 -top-40 -right-40" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/10 bottom-0 left-0" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-indigo-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Framtiden med AI
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              AI som faktiskt{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                underlättar
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Vi ser hur AI kan revolutionera byggbranschen. Inte genom att ersätta människor,
              utan genom att ta bort det tråkiga administrativa arbetet.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Brain,
                title: "Smart dokumenthantering",
                description: "AI som automatiskt kategoriserar, taggar och hittar dokument åt dig. Sluta leta – låt AI göra jobbet."
              },
              {
                icon: Clock,
                title: "Tidsbesparande rapporter",
                description: "Generera projektrapporter, statusuppdateringar och sammanfattningar med ett klick."
              },
              {
                icon: Shield,
                title: "Proaktiva varningar",
                description: "AI som upptäcker potentiella problem innan de blir kostsamma. Förseningar, risker och avvikelser."
              },
              {
                icon: Users,
                title: "Förenklad kommunikation",
                description: "Automatiska sammanfattningar av långa mailtrådar och mötesanteckningar. Missa aldrig viktig information."
              },
              {
                icon: Building2,
                title: "Branschanpassad",
                description: "AI tränad på byggbranschens terminologi och processer. Förstår skillnaden mellan en RFI och en avvikelse."
              },
              {
                icon: Zap,
                title: "Snabbare beslut",
                description: "Få AI-drivna rekommendationer baserade på projektdata. Fatta informerade beslut snabbare."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
                variants={fadeInUp}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Våra värderingar
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Det som driver oss varje dag
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Enkelhet först",
                description: "Kraftfulla verktyg behöver inte vara komplicerade. Vi designar för användaren, inte för IT-avdelningen.",
                gradient: "from-indigo-500 to-blue-500"
              },
              {
                title: "Rättvis prissättning",
                description: "Professionella verktyg ska vara tillgängliga för alla, oavsett företagsstorlek eller budget.",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                title: "Kontinuerlig innovation",
                description: "Vi stannar aldrig. Ny teknik och AI integreras löpande för att alltid ligga steget före.",
                gradient: "from-orange-500 to-red-500"
              }
            ].map((value, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${value.gradient} mx-auto mb-6 flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-white">{index + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{value.title}</h3>
                <p className="text-slate-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Redo att testa framtidens projekthantering?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Kom igång gratis idag. Inga kreditkort, inga bindningstider.
              Bara ett bättre sätt att hantera dina projekt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-slate-100 font-semibold px-8">
                  Skapa konto gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Läs mer om funktioner
                </Button>
              </Link>
            </div>
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
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Villkor</Link>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Bloxr. Alla rättigheter förbehållna.
          </p>
        </div>
      </footer>
    </main>
  )
}
