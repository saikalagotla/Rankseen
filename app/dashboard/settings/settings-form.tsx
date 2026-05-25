'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/profile'

type Props = {
  userId: string
  userName: string
  userEmail: string
  userAvatar: string | null
  profile: Profile | null
}

const businessTypes = [
  'Barbershop', 'Hair Salon', 'Nail Salon', 'Restaurant',
  'Gym / Fitness', 'Retail', 'Medical / Dental', 'Auto Service', 'Other',
]

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"

export default function SettingsForm({ userId, userName, userEmail, userAvatar, profile }: Props) {
  const router = useRouter()

  const [business, setBusiness] = useState({
    name: profile?.business_name ?? '',
    type: profile?.business_type ?? 'Barbershop',
    city: profile?.city_state ?? '',
    gbp: profile?.gbp_url ?? '',
    phone: profile?.phone ?? '',
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [keywords, setKeywords] = useState<string[]>(
    profile?.keywords?.length ? profile.keywords : []
  )
  const [newKeyword, setNewKeyword] = useState('')
  const [keywordSaving, setKeywordSaving] = useState(false)

  const [signingOut, setSigningOut] = useState(false)
  const [upgrading, setUpgrading] = useState<'starter' | 'pro' | false>(false)
  const [upgradeError, setUpgradeError] = useState('')

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          business_name: business.name.trim() || null,
          business_type: business.type,
          city_state: business.city.trim() || null,
          gbp_url: business.gbp.trim() || null,
          phone: business.phone.trim() || null,
          keywords,
        })

      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function persistKeywords(next: string[]) {
    setKeywordSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('profiles').upsert({ id: userId, keywords: next })
    } finally {
      setKeywordSaving(false)
    }
  }

  async function addKeyword() {
    const kw = newKeyword.trim().toLowerCase()
    if (!kw || keywords.includes(kw) || keywords.length >= 10) return
    const next = [...keywords, kw]
    setKeywords(next)
    setNewKeyword('')
    await persistKeywords(next)
  }

  async function removeKeyword(kw: string) {
    const next = keywords.filter(k => k !== kw)
    setKeywords(next)
    await persistKeywords(next)
  }

  async function handleUpgrade(plan: 'starter' | 'pro') {
    setUpgrading(plan)
    setUpgradeError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (e) {
      setUpgradeError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setUpgrading(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="animate-fade-in mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your business profile, keywords, and account</p>
      </div>

      {/* Business Info */}
      <div className="animate-fade-in-up bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-5">
        <SectionHeader
          title="Business Information"
          description="Used to scan directories, build your canonical NAP, and personalize your reports."
        />
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Business name">
              <input
                type="text"
                className={inputCls}
                value={business.name}
                onChange={e => setBusiness(b => ({ ...b, name: e.target.value }))}
                placeholder="e.g. The Fade Factory"
              />
            </Field>
            <Field label="Business type">
              <select
                className={inputCls}
                value={business.type}
                onChange={e => setBusiness(b => ({ ...b, type: e.target.value }))}
              >
                {businessTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="City &amp; State">
            <input
              type="text"
              className={inputCls}
              value={business.city}
              onChange={e => setBusiness(b => ({ ...b, city: e.target.value }))}
              placeholder="Austin, TX"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone number">
              <input
                type="tel"
                className={inputCls}
                value={business.phone}
                onChange={e => setBusiness(b => ({ ...b, phone: e.target.value }))}
                placeholder="(512) 555-0123"
              />
            </Field>
            <Field label="Google Business Profile URL">
              <input
                type="url"
                className={inputCls}
                value={business.gbp}
                onChange={e => setBusiness(b => ({ ...b, gbp: e.target.value }))}
                placeholder="https://g.page/your-business"
              />
            </Field>
          </div>
        </div>
        {saveError && (
          <p className="mt-3 text-xs text-red-500">{saveError}</p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60 text-white px-5 py-2.5 rounded-lg transition-all"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Keywords */}
      <div className="animate-fade-in-up delay-100 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-5">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Tracked Keywords</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Keywords SpottedHQ checks weekly in Google Maps.</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${keywords.length >= 10 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
            {keywords.length} / 10 slots
          </span>
        </div>

        {keywords.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">No keywords yet. Add some below or go through the setup flow again.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {keywords.map(kw => (
              <span key={kw} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full">
                {kw}
                <button
                  onClick={() => removeKeyword(kw)}
                  className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-0.5"
                  aria-label={`Remove ${kw}`}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {keywords.length < 10 ? (
          <div className="flex gap-2">
            <input
              type="text"
              className={`${inputCls} flex-1`}
              placeholder="e.g. barber south congress austin"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()}
            />
            <button
              onClick={addKeyword}
              disabled={!newKeyword.trim() || keywordSaving}
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white px-4 py-2.5 rounded-lg transition-colors shrink-0"
            >
              {keywordSaving ? 'Saving…' : 'Add'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-lg px-3.5 py-2.5">
            You&apos;ve used all 10 keyword slots. Remove one to add another, or upgrade to Pro for unlimited tracking.
          </p>
        )}

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">Keywords save automatically when you add or remove them.</p>
      </div>

      {/* Plan */}
      <div className="animate-fade-in-up delay-200 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-5">
        <SectionHeader
          title="Plan &amp; Billing"
          description="Your current plan and upgrade options."
        />
        {(() => {
          const currentPlan = profile?.plan ?? 'free'
          const planRank = { free: 0, solo: 0, starter: 1, pro: 2 } as Record<string, number>
          const current = planRank[currentPlan] ?? 0

          const plans = [
            {
              key: 'free',
              label: 'Free',
              price: '$0',
              features: '3 keywords · 2 AI engines · Basic scan',
            },
            {
              key: 'starter',
              label: 'Starter',
              price: '$19',
              features: '10 keywords · 3 AI engines · Basic reports',
              highlighted: true,
            },
            {
              key: 'pro',
              label: 'Pro',
              price: '$49',
              features: 'Unlimited keywords · All 5 AI engines · Growth Advisor',
            },
          ] as const

          return (
            <div className="flex flex-col gap-3">
              {plans.map(p => {
                const rank = planRank[p.key] ?? 0
                const isActive = p.key === currentPlan || (currentPlan === 'solo' && p.key === 'free')
                const canUpgrade = rank > current

                return (
                  <div
                    key={p.key}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors
                      ${isActive
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{p.label}</span>
                        {isActive && (
                          <span className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
                        )}
                        {!isActive && ('highlighted' in p) && (
                          <span className="text-xs font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full">Popular</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.features}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {p.price}<span className="text-sm font-normal text-slate-400">/mo</span>
                      </p>
                      {canUpgrade && (
                        <button
                          onClick={() => handleUpgrade(p.key as 'starter' | 'pro')}
                          disabled={upgrading === p.key}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          {upgrading === p.key ? 'Redirecting…' : 'Upgrade →'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
        {upgradeError && (
          <p className="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-lg px-3.5 py-2.5">
            {upgradeError}
          </p>
        )}
      </div>

      {/* Account */}
      <div className="animate-fade-in-up delay-300 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <SectionHeader
          title="Account"
          description="Your login information and account actions."
        />
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{userName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{userEmail}</p>
          </div>
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">Google</span>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
