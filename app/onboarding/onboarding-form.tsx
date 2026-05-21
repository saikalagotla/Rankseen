'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const businessTypes = [
  'Barbershop',
  'Hair Salon',
  'Nail Salon',
  'Restaurant',
  'Gym / Fitness',
  'Retail',
  'Medical / Dental',
  'Auto Service',
  'Other',
]

function hashKw(s: string): number {
  let h = 5381
  for (const c of s) h = ((h << 5) + h) + c.charCodeAt(0)
  return Math.abs(h)
}

function generateSuggestions(type: string, cityState: string): string[] {
  const t = type.toLowerCase()
  const city = cityState.split(',')[0].trim().toLowerCase()

  const base = [
    `${t} near me`,
    `${t} ${city}`,
    `best ${t} ${city}`,
    `${t} ${cityState.toLowerCase()}`,
    `top rated ${t} ${city}`,
    `${t} open now ${city}`,
    `affordable ${t} ${city}`,
    `${t} reviews ${city}`,
  ]

  const typeExtras: Record<string, string[]> = {
    barbershop: [`fade haircut ${city}`, `mens haircut ${city}`, `hair cut near me`, `barber ${city}`],
    'hair salon': [`haircut near me`, `hair color ${city}`, `hairstylist ${city}`, `salon near me`],
    'nail salon': [`nail salon near me`, `manicure ${city}`, `pedicure ${city}`, `gel nails ${city}`],
    restaurant: [`food near me`, `best food ${city}`, `delivery ${city}`, `takeout ${city}`],
    'gym / fitness': [`gym near me`, `fitness center ${city}`, `personal trainer ${city}`, `workout ${city}`],
    retail: [`store near me`, `shop ${city}`, `boutique ${city}`, `shopping ${city}`],
    'medical / dental': [`doctor near me`, `dentist ${city}`, `clinic near me`, `urgent care ${city}`],
    'auto service': [`mechanic near me`, `auto repair ${city}`, `oil change ${city}`, `car service ${city}`],
  }

  const extra = Object.entries(typeExtras).find(([k]) => t.includes(k))?.[1] ?? []
  return [...new Set([...base, ...extra])].slice(0, 12)
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map(n => (
        <div key={n} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            n < step
              ? 'bg-emerald-500 text-white'
              : n === step
              ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-900/40'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
          }`}>
            {n < step ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : n}
          </div>
          {n < 2 && <div className={`w-12 h-0.5 ${n < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
        </div>
      ))}
      <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">Step {step} of 2</span>
    </div>
  )
}

function loadSetupData() {
  try {
    const saved = localStorage.getItem('rankseen_setup')
    if (saved) return JSON.parse(saved) as Record<string, unknown>
  } catch {}
  return null
}

export default function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [business, setBusiness] = useState(() => {
    const d = typeof window !== 'undefined' ? loadSetupData() : null
    return {
      name: (d?.businessName as string | undefined) ?? '',
      type: (d?.businessType as string | undefined) ?? 'Barbershop',
      city: (d?.cityState as string | undefined) ?? '',
      gbp: (d?.gbpUrl as string | undefined) ?? '',
    }
  })
  const [businessErrors, setBusinessErrors] = useState({ name: false, city: false })

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customKw, setCustomKw] = useState('')
  const [loadingKeywords, setLoadingKeywords] = useState(false)

  async function goToStep2() {
    const errors = { name: !business.name.trim(), city: !business.city.trim() }
    setBusinessErrors(errors)
    if (errors.name || errors.city) return

    setStep(2)
    setLoadingKeywords(true)

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: business.name, businessType: business.type, cityState: business.city }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.keywords) && data.keywords.length > 0) {
          setSuggestions(data.keywords)
          setSelected(new Set(data.keywords.slice(0, 6)))
          setLoadingKeywords(false)
          return
        }
      }
    } catch {}

    // Fallback to static suggestions
    const sug = generateSuggestions(business.type, business.city)
    setSuggestions(sug)
    setSelected(new Set(sug.slice(0, 6)))
    setLoadingKeywords(false)
  }

  function toggleKeyword(kw: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(kw)) {
        next.delete(kw)
      } else if (next.size < 10) {
        next.add(kw)
      }
      return next
    })
  }

  function addCustom() {
    const kw = customKw.trim().toLowerCase()
    if (!kw) return
    if (!suggestions.includes(kw)) setSuggestions(prev => [...prev, kw])
    if (selected.size < 10) setSelected(prev => new Set([...prev, kw]))
    setCustomKw('')
  }

  async function handleFinish() {
    if (selected.size === 0) return
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          business_name: business.name.trim(),
          business_type: business.type,
          city_state: business.city.trim(),
          gbp_url: business.gbp.trim() || null,
          keywords: [...selected],
        })

      if (dbError) throw dbError
      try { localStorage.removeItem('rankseen_setup') } catch {}
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      console.error('Onboarding save failed:', msg)
      setError(`Something went wrong: ${msg}`)
      setSaving(false)
    }
  }

  const inputCls = (hasError = false) =>
    `w-full text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600 ${
      hasError
        ? 'border-red-400 dark:border-red-500'
        : 'border-slate-200 dark:border-slate-700'
    }`

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
      <StepIndicator step={step} />

      {step === 1 && (
        <>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Tell us about your business</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">We'll use this to scan directories and build your keyword list.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Business name <span className="text-red-400">*</span></label>
              <input
                type="text"
                className={inputCls(businessErrors.name)}
                placeholder="e.g. The Fade Factory"
                value={business.name}
                onChange={e => { setBusiness(b => ({ ...b, name: e.target.value })); setBusinessErrors(e => ({ ...e, name: false })) }}
              />
              {businessErrors.name && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Business type</label>
              <select
                className={inputCls()}
                value={business.type}
                onChange={e => setBusiness(b => ({ ...b, type: e.target.value }))}
              >
                {businessTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">City &amp; State <span className="text-red-400">*</span></label>
              <input
                type="text"
                className={inputCls(businessErrors.city)}
                placeholder="e.g. Austin, TX"
                value={business.city}
                onChange={e => { setBusiness(b => ({ ...b, city: e.target.value })); setBusinessErrors(e => ({ ...e, city: false })) }}
              />
              {businessErrors.city && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Google Business Profile URL <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="url"
                className={inputCls()}
                placeholder="https://g.page/your-business"
                value={business.gbp}
                onChange={e => setBusiness(b => ({ ...b, gbp: e.target.value }))}
              />
            </div>
          </div>

          <button
            onClick={goToStep2}
            className="mt-7 w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
          >
            Next: Choose keywords →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Choose keywords to track</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {loadingKeywords
              ? <>Generating keywords for <strong className="text-slate-700 dark:text-slate-300">{business.name}</strong>…</>
              : 'RankSeen checks your Google Maps ranking for these every Monday. Select up to 10.'}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {loadingKeywords ? (
              Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="inline-flex h-7 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"
                  style={{ width: `${5 + (i % 4) * 1.5}rem` }}
                />
              ))
            ) : suggestions.map(kw => {
              const on = selected.has(kw)
              const disabled = !on && selected.size >= 10
              return (
                <button
                  key={kw}
                  onClick={() => toggleKeyword(kw)}
                  disabled={disabled}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    on
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : disabled
                      ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  {on && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {kw}
                </button>
              )
            })}
          </div>

          {!loadingKeywords && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                className={`${inputCls()} flex-1`}
                placeholder="Add a custom keyword…"
                value={customKw}
                onChange={e => setCustomKw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom()}
              />
              <button
                onClick={addCustom}
                disabled={!customKw.trim() || selected.size >= 10}
                className="text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg transition-colors shrink-0"
              >
                Add
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs mb-6">
            <span className={`font-medium ${selected.size >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {selected.size} / 10 selected
            </span>
            {selected.size === 0 && (
              <span className="text-red-500">Select at least 1 keyword</span>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 rounded-xl transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleFinish}
              disabled={loadingKeywords || selected.size === 0 || saving}
              className="flex-[2] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? 'Setting up your dashboard…' : loadingKeywords ? 'Generating keywords…' : 'Finish setup →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
