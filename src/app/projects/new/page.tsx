'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPlans, getStorageAddons, calculateProjectPrice } from '@/app/actions/plans'
import { createProject } from '@/app/actions/projects'
import type { ProjectPlan, StorageAddon, PlanName } from '@/types/database'
import { formatPrice, formatStorage } from '@/lib/stripe'

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState<'plan' | 'details' | 'extras'>('plan')
  const [plans, setPlans] = useState<ProjectPlan[]>([])
  const [storageAddons, setStorageAddons] = useState<StorageAddon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedPlan, setSelectedPlan] = useState<ProjectPlan | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [extraUsers, setExtraUsers] = useState(0)
  const [selectedStorageAddons, setSelectedStorageAddons] = useState<string[]>([])

  // Price calculation
  const [priceBreakdown, setPriceBreakdown] = useState<{
    basePrice: number
    extraUsersPrice: number
    storagePrice: number
    totalPrice: number
    breakdown: string[]
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedPlan) {
      updatePrice()
    }
  }, [selectedPlan, extraUsers, selectedStorageAddons])

  async function loadData() {
    try {
      const [plansData, addonsData] = await Promise.all([
        getPlans(),
        getStorageAddons(),
      ])
      setPlans(plansData)
      setStorageAddons(addonsData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Kunde inte ladda prisplaner')
    } finally {
      setIsLoading(false)
    }
  }

  async function updatePrice() {
    if (!selectedPlan) return
    try {
      const price = await calculateProjectPrice(
        selectedPlan.id,
        extraUsers,
        selectedStorageAddons
      )
      setPriceBreakdown(price)
    } catch (err) {
      console.error('Failed to calculate price:', err)
    }
  }

  async function handleCreateProject() {
    if (!selectedPlan || !projectName) return

    setIsCreating(true)
    setError(null)

    try {
      // If it's a paid plan, redirect to Stripe checkout
      if (selectedPlan.name !== 'free' && priceBreakdown && priceBreakdown.totalPrice > 0) {
        // Store project data in session storage for after checkout
        sessionStorage.setItem('pendingProject', JSON.stringify({
          name: projectName,
          project_number: projectNumber || undefined,
          address: address || undefined,
          city: city || undefined,
          plan_id: selectedPlan.id,
          extra_users: extraUsers,
          storage_addon_ids: selectedStorageAddons,
        }))

        // Redirect to checkout API
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_id: selectedPlan.id,
            extra_users: extraUsers,
            storage_addon_ids: selectedStorageAddons,
            project_name: projectName,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Kunde inte starta betalning')
        }

        if (data.checkout_url) {
          window.location.href = data.checkout_url
        } else if (data.redirect_url) {
          // Free plan created via API
          router.push(data.redirect_url)
        }
        return
      }

      // Free plan - create project directly
      const project = await createProject({
        name: projectName,
        project_number: projectNumber || undefined,
        address: address || undefined,
        city: city || undefined,
      })

      router.push(`/dashboard/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
      setIsCreating(false)
    }
  }

  function toggleStorageAddon(addonId: string) {
    setSelectedStorageAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Laddar prisplaner...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/projects" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon />
            <span>Tillbaka</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D2</span>
            </div>
            <span className="text-white font-semibold">Skapa projekt</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <StepIndicator step={1} label="Välj plan" active={step === 'plan'} completed={step !== 'plan'} />
          <div className="w-12 h-px bg-slate-700" />
          <StepIndicator step={2} label="Projektdetaljer" active={step === 'details'} completed={step === 'extras'} />
          <div className="w-12 h-px bg-slate-700" />
          <StepIndicator step={3} label="Tillägg" active={step === 'extras'} completed={false} />
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Step 1: Choose plan */}
        {step === 'plan' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Välj prisplan</h1>
              <p className="text-slate-400">
                Välj den plan som passar ditt projekt bäst
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.filter(p => p.name !== 'enterprise').map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selected={selectedPlan?.id === plan.id}
                  onSelect={() => setSelectedPlan(plan)}
                />
              ))}
            </div>

            {/* Enterprise CTA */}
            <div className="mt-8 p-6 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Behöver du mer?</h3>
              <p className="text-slate-400 mb-4">
                Enterprise-planen inkluderar obegränsade användare, lagring och prioriterad support.
              </p>
              <a href="mailto:kontakt@dalux2.se" className="text-blue-400 hover:text-blue-300">
                Kontakta oss för offert →
              </a>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep('details')}
                disabled={!selectedPlan}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fortsätt
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Project details */}
        {step === 'details' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Projektdetaljer</h1>
              <p className="text-slate-400">
                Fyll i information om ditt projekt
              </p>
            </div>

            <div className="max-w-xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Projektnamn *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="T.ex. Nybyggnad Villa Andersson"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Projektnummer
                  </label>
                  <input
                    type="text"
                    value={projectNumber}
                    onChange={(e) => setProjectNumber(e.target.value)}
                    placeholder="T.ex. 2024-001"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Adress
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="T.ex. Storgatan 1"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Ort
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="T.ex. Stockholm"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep('plan')}
                  className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                  Tillbaka
                </button>
                <button
                  onClick={() => setStep('extras')}
                  disabled={!projectName}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fortsätt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Extras */}
        {step === 'extras' && selectedPlan && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Anpassa ditt paket</h1>
              <p className="text-slate-400">
                Lägg till extra användare eller lagring vid behov
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Extras selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Extra users */}
                {selectedPlan.name !== 'free' && selectedPlan.extra_user_price > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Extra användare</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Din plan inkluderar {selectedPlan.included_users} användare.
                      {selectedPlan.max_users && ` Max ${selectedPlan.max_users} totalt.`}
                    </p>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setExtraUsers(Math.max(0, extraUsers - 1))}
                        disabled={extraUsers === 0}
                        className="w-10 h-10 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        -
                      </button>
                      <div className="text-center">
                        <span className="text-2xl font-bold text-white">{extraUsers}</span>
                        <p className="text-slate-500 text-sm">extra användare</p>
                      </div>
                      <button
                        onClick={() => {
                          const maxExtra = selectedPlan.max_users
                            ? selectedPlan.max_users - selectedPlan.included_users
                            : 100
                          setExtraUsers(Math.min(maxExtra, extraUsers + 1))
                        }}
                        className="w-10 h-10 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                      >
                        +
                      </button>
                      <span className="text-slate-400 ml-4">
                        {formatPrice(selectedPlan.extra_user_price)}/användare/mån
                      </span>
                    </div>
                  </div>
                )}

                {/* Storage addons */}
                {selectedPlan.name !== 'free' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Extra lagring</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Din plan inkluderar {formatStorage(selectedPlan.storage_mb)}.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      {storageAddons.map((addon) => (
                        <button
                          key={addon.id}
                          onClick={() => toggleStorageAddon(addon.id)}
                          className={`p-4 rounded-lg border transition-all ${
                            selectedStorageAddons.includes(addon.id)
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <p className="text-white font-medium">{addon.display_name}</p>
                          <p className="text-slate-400 text-sm">{formatPrice(addon.price_monthly)}/mån</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPlan.name === 'free' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                    <p className="text-slate-400">
                      Gratisplanen har fasta begränsningar. Uppgradera till en betald plan för att lägga till fler användare eller lagring.
                    </p>
                  </div>
                )}
              </div>

              {/* Price summary */}
              <div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Sammanfattning</h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-slate-400">
                      <span>Plan</span>
                      <span className="text-white">{selectedPlan.display_name}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Projekt</span>
                      <span className="text-white truncate ml-4">{projectName}</span>
                    </div>
                    {extraUsers > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Extra användare</span>
                        <span className="text-white">{extraUsers} st</span>
                      </div>
                    )}
                    {selectedStorageAddons.length > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Extra lagring</span>
                        <span className="text-white">{selectedStorageAddons.length} paket</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-700 pt-4 mb-6">
                    {priceBreakdown && priceBreakdown.breakdown.map((line, i) => (
                      <p key={i} className="text-slate-400 text-sm mb-1">{line}</p>
                    ))}
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-white font-semibold">Totalt per månad</span>
                      <span className="text-2xl font-bold text-white">
                        {priceBreakdown ? formatPrice(priceBreakdown.totalPrice) : formatPrice(selectedPlan.base_price_monthly)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateProject}
                    disabled={isCreating || !projectName}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Skapar...' : selectedPlan.name === 'free' ? 'Skapa projekt' : 'Gå till betalning'}
                  </button>

                  {selectedPlan.name !== 'free' && (
                    <p className="text-slate-500 text-xs text-center mt-3">
                      Du kommer att omdirigeras till Stripe för säker betalning
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-start mt-8">
              <button
                onClick={() => setStep('details')}
                className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
              >
                Tillbaka
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StepIndicator({ step, label, active, completed }: {
  step: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        active
          ? 'bg-blue-600 text-white'
          : completed
          ? 'bg-green-600 text-white'
          : 'bg-slate-800 text-slate-400'
      }`}>
        {completed ? '✓' : step}
      </div>
      <span className={active ? 'text-white' : 'text-slate-400'}>{label}</span>
    </div>
  )
}

function PlanCard({ plan, selected, onSelect }: {
  plan: ProjectPlan
  selected: boolean
  onSelect: () => void
}) {
  const isPopular = plan.name === 'medium'

  return (
    <button
      onClick={onSelect}
      className={`relative text-left p-6 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
          Populär
        </div>
      )}

      <h3 className="text-xl font-bold text-white mb-1">{plan.display_name}</h3>
      <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

      <div className="mb-4">
        <span className="text-3xl font-bold text-white">
          {formatPrice(plan.base_price_monthly)}
        </span>
        {plan.base_price_monthly > 0 && (
          <span className="text-slate-400">/mån</span>
        )}
      </div>

      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2 text-slate-300">
          <CheckIcon className="text-green-400" />
          {plan.included_users} användare inkl.
        </li>
        <li className="flex items-center gap-2 text-slate-300">
          <CheckIcon className="text-green-400" />
          {formatStorage(plan.storage_mb)} lagring
        </li>
        {plan.features.documents && (
          <li className="flex items-center gap-2 text-slate-300">
            <CheckIcon className="text-green-400" />
            Dokumenthantering
          </li>
        )}
        {plan.features.drawings && (
          <li className="flex items-center gap-2 text-slate-300">
            <CheckIcon className="text-green-400" />
            Ritningsvisare
          </li>
        )}
        {plan.features.api && (
          <li className="flex items-center gap-2 text-slate-300">
            <CheckIcon className="text-green-400" />
            API-access
          </li>
        )}
        {plan.features.reports && (
          <li className="flex items-center gap-2 text-slate-300">
            <CheckIcon className="text-green-400" />
            Rapporter
          </li>
        )}
      </ul>
    </button>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}
