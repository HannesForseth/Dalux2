'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Building2, Heart } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <motion.footer
      className="mt-auto py-6 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="bg-white/50 backdrop-blur-sm border border-slate-200/50 rounded-2xl px-6 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-slate-500">
              © {currentYear} ByggSmart. Byggd med{' '}
              <Heart className="inline w-3 h-3 text-pink-500 fill-pink-500 mx-0.5" />{' '}
              i Sverige
            </span>
          </div>

          {/* Quick Links */}
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard/help"
              className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Hjälp
            </Link>
            <Link
              href="/dashboard/settings"
              className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Inställningar
            </Link>
            <a
              href="mailto:support@byggsmart.se"
              className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Support
            </a>
          </nav>
        </div>
      </div>
    </motion.footer>
  )
}
