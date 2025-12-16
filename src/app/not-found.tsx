'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12 overflow-hidden relative">
      {/* Animated background blobs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          top: "-200px",
          left: "-200px",
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
          bottom: "-150px",
          right: "-150px",
        }}
        animate={{
          x: [0, -20, 0],
          y: [0, -30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="inline-block mb-8">
            <Image
              src="/bloxr-logo.png"
              alt="Bloxr"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </motion.div>

        {/* 404 number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <span className="text-[120px] sm:text-[160px] font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent leading-none">
            404
          </span>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            Sidan kunde inte hittas
          </h1>
          <p className="text-slate-600 mb-8 text-base sm:text-lg">
            Sidan du letar efter finns inte eller har flyttats till en annan adress.
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300"
          >
            <Link href="/">
              <Home className="w-5 h-5 mr-2" />
              Till startsidan
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-xl font-semibold border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300"
          >
            <Link href="/dashboard">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Till Dashboard
            </Link>
          </Button>
        </motion.div>

        {/* Help links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 pt-8 border-t border-slate-200"
        >
          <p className="text-sm text-slate-500 mb-4">Kanske kan detta hjälpa:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/projects"
              className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <Search className="w-4 h-4" />
              Mina projekt
            </Link>
            <Link
              href="/dashboard/help"
              className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Hjälpcenter
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
