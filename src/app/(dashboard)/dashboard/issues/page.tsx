'use client'

import Link from 'next/link'

export default function IssuesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Avvikelser</h1>
        <p className="text-slate-400 mt-1">Spåra och hantera projektavvikelser</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
          <ExclamationIcon />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Kommer snart</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Avvikelsehantering med status, prioritet, tilldelning och bildbilagor kommer i nästa uppdatering.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
        >
          <ArrowLeftIcon />
          Tillbaka till dashboard
        </Link>
      </div>
    </div>
  )
}

function ExclamationIcon() {
  return (
    <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}
