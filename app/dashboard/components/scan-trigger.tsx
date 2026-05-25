'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Props = {
  endpoint: string
  label?: string
  disabled?: boolean
  variant?: 'button' | 'link'
  needsSetup?: boolean
}

export default function ScanTrigger({
  endpoint,
  label = 'Scan now',
  disabled = false,
  variant = 'button',
  needsSetup = false,
}: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showSetupModal, setShowSetupModal] = useState(false)

  async function handleScan() {
    if (state === 'scanning' || disabled) return
    if (needsSetup) { setShowSetupModal(true); return }
    setState('scanning')
    setErrorMsg('')

    try {
      const res = await fetch(endpoint, { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        setErrorMsg(json.error ?? 'Scan failed')
        setState('error')
        return
      }

      setState('done')
      router.refresh()
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setErrorMsg('Network error')
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const setupModal = showSetupModal && (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowSetupModal(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-7 max-w-sm w-full pointer-events-auto">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Complete your setup first</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Add your business name, type, and city so SpottedHQ knows what to scan for.
          </p>
          <div className="flex gap-3">
            <Link
              href="/dashboard/settings"
              className="flex-1 text-center bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              onClick={() => setShowSetupModal(false)}
            >
              Go to Settings
            </Link>
            <button
              onClick={() => setShowSetupModal(false)}
              className="px-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )

  if (variant === 'link') {
    return (
      <>
        {setupModal}
        <button
          onClick={handleScan}
          disabled={disabled || state === 'scanning'}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {state === 'scanning' ? 'Scanning…' : state === 'done' ? '✓ Done' : state === 'error' ? errorMsg : label}
        </button>
      </>
    )
  }

  return (
    <>
      {setupModal}
      <div className="flex items-center gap-2">
        {state === 'error' && (
          <span className="text-xs text-red-500">{errorMsg}</span>
        )}
        <button
          onClick={handleScan}
          disabled={disabled || state === 'scanning'}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors border ${
            state === 'done'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {state === 'scanning' ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning…
            </span>
          ) : state === 'done' ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Updated
            </span>
          ) : label}
        </button>
      </div>
    </>
  )
}
