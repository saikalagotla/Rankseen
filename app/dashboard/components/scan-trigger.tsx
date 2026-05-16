'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  endpoint: string
  label?: string
  disabled?: boolean
  variant?: 'button' | 'link'
}

export default function ScanTrigger({
  endpoint,
  label = 'Scan now',
  disabled = false,
  variant = 'button',
}: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleScan() {
    if (state === 'scanning' || disabled) return
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

  if (variant === 'link') {
    return (
      <button
        onClick={handleScan}
        disabled={disabled || state === 'scanning'}
        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {state === 'scanning' ? 'Scanning…' : state === 'done' ? '✓ Done' : state === 'error' ? errorMsg : label}
      </button>
    )
  }

  return (
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
  )
}
