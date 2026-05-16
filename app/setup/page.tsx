'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type BusinessType = 'Restaurant' | 'Barbershop/Salon' | 'Dental/Medical' | 'Auto Repair' | 'Gym/Fitness' | 'Retail Store' | 'Other'

const keywordSuggestions: Record<BusinessType, string[]> = {
  'Restaurant': ['best restaurant near me', 'restaurants in [city]', 'dinner near me', 'lunch spots near me', 'good food near me'],
  'Barbershop/Salon': ['barbershop near me', 'best fade haircut', 'hair salon near me', 'barber shop [city]', 'mens haircut near me'],
  'Dental/Medical': ['dentist near me', 'dental clinic [city]', 'emergency dentist', 'family dentist near me', 'teeth cleaning near me'],
  'Auto Repair': ['auto repair near me', 'car mechanic [city]', 'oil change near me', 'best mechanic near me', 'brake repair near me'],
  'Gym/Fitness': ['gym near me', 'fitness center [city]', 'personal trainer near me', 'crossfit near me', 'yoga studio near me'],
  'Retail Store': ['[type] store near me', 'best [type] shop [city]', '[type] near me', 'local [type] store', 'where to buy [type]'],
  'Other': ['best [business] near me', '[business] in [city]', '[business] near me', '[type] services [city]', 'local [business]'],
}

const steps = ['Business Info', 'Keywords', 'Choose Plan']

const plans = [
  {
    name: 'Solo',
    price: '$15',
    description: 'For single-location businesses.',
    features: ['1 location', '10 keywords tracked', 'Weekly digest email', 'Citation scan', 'Maps rank tracking'],
    highlighted: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$25',
    description: 'Full picture — maps, AI, reviews.',
    features: ['Everything in Solo', 'AI visibility (5 engines)', 'Review monitoring', 'Competitor snapshot', 'Priority support'],
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Freelancer',
    price: '$49',
    description: 'For agencies managing clients.',
    features: ['5 locations', 'All Pro features', 'White-label PDF reports', 'Client sharing links', 'Bulk keyword import'],
    highlighted: false,
    badge: null,
  },
]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType>('Restaurant')
  const [cityState, setCityState] = useState('')
  const [gbpUrl, setGbpUrl] = useState('')

  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')

  // Populate keywords when business type changes
  useEffect(() => {
    const suggestions = keywordSuggestions[businessType]
    setKeywords(suggestions.slice(0, 5))
  }, [businessType])

  // Load persisted data
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rankseen_setup')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.businessName) setBusinessName(data.businessName)
        if (data.businessType) setBusinessType(data.businessType)
        if (data.cityState) setCityState(data.cityState)
        if (data.gbpUrl) setGbpUrl(data.gbpUrl)
        if (data.keywords) setKeywords(data.keywords)
      }
    } catch {}
  }, [])

  const saveToLocalStorage = (extra: Record<string, unknown> = {}) => {
    try {
      localStorage.setItem('rankseen_setup', JSON.stringify({
        businessName,
        businessType,
        cityState,
        gbpUrl,
        keywords,
        ...extra,
      }))
    } catch {}
  }

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim()
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 10) {
      setKeywords([...keywords, trimmed])
    }
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw))
  }

  const handleStep1Next = () => {
    if (!businessName.trim() || !cityState.trim()) return
    saveToLocalStorage()
    setStep(1)
  }

  const handleStep2Next = () => {
    saveToLocalStorage()
    setStep(2)
  }

  const handlePlanSelect = (planName: string) => {
    saveToLocalStorage({ selectedPlan: planName, completedAt: new Date().toISOString() })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300" style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
      {/* Top bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Rank<span className="text-emerald-500">Seen</span>
        </Link>
        <span className="text-sm text-slate-400 dark:text-slate-500">Setup · Step {step + 1} of 3</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Progress */}
          <div className="flex items-center gap-3 mb-10">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i < step
                      ? 'bg-emerald-500 text-white'
                      : i === step
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}>
                    {i < step ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-sm hidden sm:block ${i === step ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded ${i < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Business Info */}
          {step === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tell us about your business</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">We&apos;ll use this to set up your tracking and generate keyword suggestions.</p>

              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Business name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. The Fade Factory"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Business type <span className="text-red-500">*</span></label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {Object.keys(keywordSuggestions).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">City &amp; State <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={cityState}
                    onChange={(e) => setCityState(e.target.value)}
                    placeholder="e.g. Austin, TX"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Google Business Profile URL
                    <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={gbpUrl}
                    onChange={(e) => setGbpUrl(e.target.value)}
                    placeholder="https://business.google.com/..."
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handleStep1Next}
                disabled={!businessName.trim() || !cityState.trim()}
                className="mt-8 w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                Continue &rarr;
              </button>
            </div>
          )}

          {/* Step 2: Keywords */}
          {step === 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Choose your keywords</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                We pre-filled suggestions based on <strong className="text-slate-700 dark:text-slate-300">{businessType}</strong> businesses. Add or remove up to 10.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">{keywords.length}/10 keywords selected</p>

              {/* Keyword chips */}
              <div className="flex flex-wrap gap-2 mb-5 min-h-[2.5rem]">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-sm px-3 py-1.5 rounded-full"
                  >
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="text-emerald-400 dark:text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                      aria-label={`Remove ${kw}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>

              {/* Add keyword input */}
              {keywords.length < 10 && (
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addKeyword(keywordInput)
                      }
                    }}
                    placeholder="Add a keyword and press Enter"
                    className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => addKeyword(keywordInput)}
                    disabled={!keywordInput.trim()}
                    className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 py-3 rounded-xl font-semibold text-sm transition-colors"
                >
                  &larr; Back
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={keywords.length === 0}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition-colors"
                >
                  Continue &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Plan */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Choose your plan</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">14-day free trial on all plans. No credit card required.</p>
              </div>

              <div className="flex flex-col gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`relative rounded-2xl p-6 border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      plan.highlighted
                        ? 'bg-slate-900 dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    onClick={() => handlePlanSelect(plan.name)}
                  >
                    {plan.badge && (
                      <span className="absolute -top-3 left-6 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm font-semibold uppercase tracking-wider mb-1 ${plan.highlighted ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-500'}`}>{plan.name}</p>
                        <p className={`text-sm ${plan.highlighted ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{plan.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-3xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{plan.price}</span>
                        <span className={`text-sm ${plan.highlighted ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>/mo</span>
                      </div>
                    </div>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-4">
                      {plan.features.map((f) => (
                        <li key={f} className={`text-xs flex items-center gap-1 ${plan.highlighted ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className={`mt-5 text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                        : 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    }`}>
                      Start Free Trial
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="mt-6 w-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                &larr; Back
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
