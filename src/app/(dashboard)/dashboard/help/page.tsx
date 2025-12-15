'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

const helpTopics = [
  {
    title: 'Komma igång',
    icon: <RocketIcon />,
    items: [
      { title: 'Skapa ditt första projekt', description: 'Lär dig hur du skapar och konfigurerar ett nytt projekt' },
      { title: 'Bjud in teammedlemmar', description: 'Lägg till kollegor och tilldela roller' },
      { title: 'Ladda upp dokument', description: 'Organisera projektdokument effektivt' },
    ]
  },
  {
    title: 'Protokoll',
    icon: <DocumentIcon />,
    items: [
      { title: 'Skapa mötesprotokoll', description: 'Dokumentera möten med deltagare och beslut' },
      { title: 'Åtgärdspunkter', description: 'Tilldela och följ upp åtgärder från möten' },
      { title: 'Exportera protokoll', description: 'Ladda ner protokoll som PDF' },
    ]
  },
  {
    title: 'Ärenden & Avvikelser',
    icon: <ExclamationIcon />,
    items: [
      { title: 'Rapportera ärenden', description: 'Skapa och spåra projektärenden' },
      { title: 'Hantera avvikelser', description: 'Dokumentera och följ upp avvikelser' },
      { title: 'Prioritering och status', description: 'Filtrera och sortera efter prioritet' },
    ]
  },
  {
    title: 'Kalender',
    icon: <CalendarIcon />,
    items: [
      { title: 'Visa händelser', description: 'Se alla deadlines och möten' },
      { title: 'Skapa påminnelser', description: 'Lägg till egna kalenderhändelser' },
      { title: 'Deadline-överblick', description: 'Håll koll på kommande förfallodatum' },
    ]
  },
]

export default function HelpPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Hjälp & Support
        </h1>
        <p className="text-slate-500 mt-2">
          Här hittar du guider och svar på vanliga frågor
        </p>
      </motion.div>

      {/* Quick Links */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickLink
          href="/projects"
          icon={<FolderIcon />}
          title="Mina projekt"
          description="Gå till projektöversikten"
        />
        <QuickLink
          href="/dashboard/settings"
          icon={<CogIcon />}
          title="Inställningar"
          description="Hantera ditt konto"
        />
        <QuickLink
          href="mailto:support@dalux.se"
          icon={<MailIcon />}
          title="Kontakta support"
          description="Få hjälp från vårt team"
          external
        />
      </motion.div>

      {/* Help Topics */}
      <div className="space-y-6">
        {helpTopics.map((topic, topicIndex) => (
          <motion.div
            key={topic.title}
            variants={itemVariants}
            className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                {topic.icon}
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{topic.title}</h2>
            </div>

            <div className="space-y-3">
              {topic.items.map((item, itemIndex) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: topicIndex * 0.1 + itemIndex * 0.05, duration: 0.3 }}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <ChevronRightIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-slate-900 font-medium group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-slate-500 text-sm">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* FAQ Section */}
      <motion.div
        variants={itemVariants}
        className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Vanliga frågor</h2>

        <div className="space-y-4">
          <FAQItem
            question="Hur bjuder jag in nya medlemmar till ett projekt?"
            answer="Gå till projektets inställningar och klicka på 'Bjud in medlem'. Ange e-postadressen och välj vilken roll personen ska ha."
          />
          <FAQItem
            question="Kan jag exportera protokoll till PDF?"
            answer="Ja! Öppna protokollet och klicka på 'Exportera PDF' knappen i övre högra hörnet."
          />
          <FAQItem
            question="Hur skapar jag en påminnelse i kalendern?"
            answer="Klicka på expandera-knappen i minikalendern på projektöversikten, sedan 'Ny händelse'."
          />
        </div>
      </motion.div>

      {/* Contact Support */}
      <motion.div
        variants={itemVariants}
        className="mt-8 text-center py-8"
      >
        <p className="text-slate-500 mb-4">
          Hittade du inte svaret du letade efter?
        </p>
        <a
          href="mailto:support@dalux.se"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          <MailIcon className="w-5 h-5" />
          Kontakta support
        </a>
      </motion.div>
    </motion.div>
  )
}

function QuickLink({
  href,
  icon,
  title,
  description,
  external = false
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  external?: boolean
}) {
  const Component = external ? 'a' : Link
  const props = external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href }

  return (
    <Component {...props}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            {icon}
          </div>
          <div>
            <p className="text-slate-900 font-medium group-hover:text-indigo-600 transition-colors">{title}</p>
            <p className="text-slate-500 text-sm">{description}</p>
          </div>
        </div>
      </motion.div>
    </Component>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="p-4 bg-white/60 rounded-xl">
      <p className="text-slate-900 font-medium mb-2">{question}</p>
      <p className="text-slate-600 text-sm">{answer}</p>
    </div>
  )
}

// Icons
function RocketIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function ExclamationIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}

function CogIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function MailIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}
