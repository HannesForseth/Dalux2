'use client'

import { useState } from 'react'

interface FolderSuggestion {
  path: string
  description: string
}

interface AIFolderWizardProps {
  isOpen: boolean
  onClose: () => void
  onCreateFolders: (folders: string[]) => Promise<void>
}

const PROJECT_TYPES = [
  { id: 'nybyggnation_villa', name: 'Nybyggnation - Villa/Småhus', icon: '🏠' },
  { id: 'nybyggnation_flerbostadshus', name: 'Nybyggnation - Flerbostadshus', icon: '🏢' },
  { id: 'nybyggnation_industri', name: 'Nybyggnation - Industri/Lager', icon: '🏭' },
  { id: 'nybyggnation_kontor', name: 'Nybyggnation - Kontor', icon: '🏛️' },
  { id: 'renovering', name: 'Renovering', icon: '🔧' },
  { id: 'tillbyggnad', name: 'Tillbyggnad', icon: '📐' },
  { id: 'infrastruktur', name: 'Infrastruktur (väg, VA)', icon: '🛣️' },
  { id: 'anlaggning', name: 'Anläggning', icon: '🏗️' },
  { id: 'annat', name: 'Annat', icon: '📁' },
]

export default function AIFolderWizard({
  isOpen,
  onClose,
  onCreateFolders
}: AIFolderWizardProps) {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [customRequirements, setCustomRequirements] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestedFolders, setSuggestedFolders] = useState<FolderSuggestion[]>([])
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set())
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleGenerate = async () => {
    if (!selectedType) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/folder-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: PROJECT_TYPES.find(t => t.id === selectedType)?.name || selectedType,
          projectDescription: description,
          customRequirements
        })
      })

      if (!response.ok) {
        throw new Error('Kunde inte generera mappstruktur')
      }

      const data = await response.json()
      setSuggestedFolders(data.folders || [])
      setSelectedFolders(new Set(data.folders?.map((f: FolderSuggestion) => f.path) || []))
      setExplanation(data.explanation || '')
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleFolder = (path: string) => {
    setSelectedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleCreate = async () => {
    const foldersToCreate = Array.from(selectedFolders)
    if (foldersToCreate.length === 0) return

    setIsCreating(true)
    try {
      await onCreateFolders(foldersToCreate)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skapa mappar')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedType(null)
    setDescription('')
    setCustomRequirements('')
    setSuggestedFolders([])
    setSelectedFolders(new Set())
    setExplanation('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-2xl mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <SparklesIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Mappstruktur</h2>
              <p className="text-sm text-slate-400">Steg {step} av 3</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-300 mb-6">
                Välj vilken typ av projekt du arbetar med så skapar AI:n en anpassad mappstruktur.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {PROJECT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{type.icon}</span>
                    <span className={`font-medium ${
                      selectedType === type.id ? 'text-white' : 'text-slate-300'
                    }`}>
                      {type.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Beskriv projektet (valfritt)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="t.ex. Nybyggnation av 24 lägenheter i 4 våningar med underjordiskt garage..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Särskilda krav eller önskemål (valfritt)
                </label>
                <textarea
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                  placeholder="t.ex. Separata mappar för varje entreprenör, BIM-koordinering, miljöcertifiering..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {explanation && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-blue-300 mb-2">Om denna mappstruktur</h4>
                      <div className="text-sm text-blue-300/80 space-y-2">
                        {explanation.split('. ').filter(s => s.trim()).map((sentence, index, arr) => (
                          <p key={index} className="leading-relaxed">
                            {sentence.trim()}{index < arr.length - 1 && !sentence.endsWith('.') ? '.' : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">Föreslagna mappar</h3>
                  <span className="text-sm text-slate-400">
                    {selectedFolders.size} av {suggestedFolders.length} valda
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {suggestedFolders.map((folder) => (
                    <label
                      key={folder.path}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFolders.has(folder.path)
                          ? 'bg-slate-800'
                          : 'bg-slate-800/30 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFolders.has(folder.path)}
                        onChange={() => toggleFolder(folder.path)}
                        className="mt-1 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FolderIcon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                          <span className="text-white font-mono text-sm truncate">
                            {folder.path}
                          </span>
                        </div>
                        {folder.description && (
                          <p className="text-slate-400 text-xs mt-1">
                            {folder.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            {step === 1 ? 'Avbryt' : 'Tillbaka'}
          </button>

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!selectedType}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Nästa
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:from-purple-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  Genererar...
                </>
              ) : (
                <>
                  <SparklesIcon />
                  Generera struktur
                </>
              )}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleCreate}
              disabled={selectedFolders.size === 0 || isCreating}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <LoadingSpinner />
                  Skapar...
                </>
              ) : (
                <>
                  Skapa {selectedFolders.size} mappar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Icons
function SparklesIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
