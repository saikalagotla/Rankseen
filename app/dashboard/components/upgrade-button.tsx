'use client'

import React from 'react'

type Variant = 'button' | 'small' | 'link'

export default function UpgradeButton({
  label = 'Upgrade to Pro',
  variant = 'button',
  plan = 'pro',
}: {
  label?: string
  variant?: Variant
  plan?: 'starter' | 'pro'
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
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
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  const cls: Record<Variant, string> = {
    button: 'bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors',
    small:  'bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
    link:   'text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline disabled:opacity-50',
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button onClick={handleClick} disabled={loading} className={cls[variant]}>
        {loading ? 'Redirecting…' : label}{variant === 'link' ? ' →' : ''}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
