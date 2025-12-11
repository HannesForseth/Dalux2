'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function ProjectIssuesPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-white">Avvikelser</h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Inga avvikelser än</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Rapportera och spåra avvikelser, fel och problem som upptäcks under projektet.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors">
          Rapportera avvikelse
        </button>
      </div>
    </div>
  )
}
