'use client'

import { useState } from 'react'
import Link from 'next/link'

const BUSINESS_TYPES = [
  'Restaurant', 'Barbershop/Salon', 'Dental/Medical', 'Auto Repair',
  'Gym/Fitness', 'Retail Store', 'Law Firm', 'Real Estate', 'Plumber/HVAC', 'Other',
]

export default function GeneratePage() {
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('Restaurant')
  const [cityState, setCityState]       = useState('')
  const [keywordsRaw, setKeywordsRaw]   = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [result, setResult]             = useState<{ token: string; url: string } | null>(null)
  const [copied, setCopied]             = useState(false)
  const [history, setHistory]           = useState<Array<{ name: string; url: string }>>([])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setCopied(false)

    const keywords = keywordsRaw
      .split('\n')
      .map(k => k.trim())
      .filter(Boolean)

    const res = await fetch('/api/generate-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, businessType, cityState, keywords }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      return
    }

    const url = `${window.location.origin}/snapshot/${json.token}`
    setResult({ token: json.token, url })
    setHistory(prev => [{ name: businessName, url }, ...prev])
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-slate-900 dark:text-white tracking-tight">
          Spotted<span className="text-emerald-500">HQ</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          Dashboard &rarr;
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Generate a Business Snapshot</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Run a live scan and get a shareable link to send to any business.</p>
        </div>

        <form onSubmit={handleGenerate} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Business name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. The Fade Factory"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Business type</label>
            <select
              value={businessType}
              onChange={e => setBusinessType(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              City &amp; State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={cityState}
              onChange={e => setCityState(e.target.value)}
              placeholder="e.g. Austin, TX"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Keywords <span className="text-slate-400 font-normal">(one per line — leave blank to auto-generate)</span>
            </label>
            <textarea
              value={keywordsRaw}
              onChange={e => setKeywordsRaw(e.target.value)}
              placeholder={"barbershop near me\nbest fade Austin\nhaircut near me"}
              rows={4}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none font-mono"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Running scans… this takes ~30 seconds' : 'Generate Snapshot'}
          </button>
        </form>

        {result && (
          <div className="mt-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-3">Snapshot ready — copy the link below</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={result.url}
                className="flex-1 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-mono focus:outline-none"
              />
              <button
                onClick={() => handleCopy(result.url)}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Preview &rarr;
            </a>
          </div>
        )}

        {history.length > 1 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Generated this session</h2>
            <div className="space-y-2">
              {history.map((item, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                  <button
                    onClick={() => handleCopy(item.url)}
                    className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    Copy link
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
