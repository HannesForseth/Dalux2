'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

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
            <Image
              src="/bloxr-icon.png"
              alt="Bloxr"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span className="text-sm text-slate-500">
              © {currentYear} Bloxr. Byggd med{' '}
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
              href="mailto:support@bloxr.se"
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
