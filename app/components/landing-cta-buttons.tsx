'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function LandingCtaButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState<'trial' | 'demo' | null>(null)

  const handleTrial = () => {
    if (loading) return
    setLoading('trial')
    router.push('/setup')
  }

  const handleDemo = () => {
    if (loading) return
    setLoading('demo')
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        onClick={handleTrial}
        disabled={!!loading}
        className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:cursor-wait text-white px-8 py-4 rounded-xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-emerald-500/25 inline-flex items-center justify-center gap-2 min-w-[180px]"
      >
        {loading === 'trial' ? (
          <><Spinner />Loading…</>
        ) : (
          'Start Free Trial'
        )}
      </button>
      <button
        onClick={handleDemo}
        disabled={!!loading}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 px-8 py-4 rounded-xl font-semibold text-base transition-all hover:shadow-md active:scale-95 disabled:cursor-wait inline-flex items-center justify-center gap-2 min-w-[160px]"
      >
        {loading === 'demo' ? (
          <><Spinner />Loading…</>
        ) : (
          'See Demo →'
        )}
      </button>
    </div>
  )
}
