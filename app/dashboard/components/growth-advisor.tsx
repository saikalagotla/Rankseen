'use client'

import { useState } from 'react'

type Action = {
  priority: number
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
}

const CACHE_KEY = 'spottedhq_action_plan'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function loadCached(): Action[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { actions, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return actions
  } catch {
    return null
  }
}

function saveCache(actions: Action[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ actions, ts: Date.now() }))
  } catch {}
}

const impactColors = {
  high: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
  medium: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
}

const priorityColors = [
  'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
  'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
]

export default function GrowthAdvisor() {
  const [actions, setActions] = useState<Action[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    const cached = loadCached()
    if (cached) { setActions(cached); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/action-plan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setActions(data.actions)
      saveCache(data.actions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function refresh() {
    localStorage.removeItem(CACHE_KEY)
    setActions(null)
    setError(null)
    generate()
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Growth Advisor</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">AI-generated action plan based on your latest scan data</p>
        </div>
        {actions && (
          <button
            onClick={refresh}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {!actions && !loading && !error && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Get your personalized action plan</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Analyzes your Maps rankings, AI visibility, and citations to generate 3 specific things to do this week</p>
            </div>
            <button
              onClick={generate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Generate action plan
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">Analyzing your data...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <button
              onClick={generate}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {actions && (
          <ol className="flex flex-col gap-5">
            {actions.map((action, i) => (
              <li key={action.priority} className="flex gap-4">
                <span className={`w-7 h-7 rounded-full font-bold text-sm flex items-center justify-center shrink-0 ${priorityColors[i] ?? priorityColors[2]}`}>
                  {action.priority}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{action.title}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${impactColors[action.impact] ?? impactColors.medium}`}>
                      {action.impact} impact
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{action.description}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
