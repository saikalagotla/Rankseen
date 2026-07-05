import Link from 'next/link'
import { redirect } from 'next/navigation'

const PLAN_COPY: Record<string, { name: string; blurb: string }> = {
  starter: {
    name: 'Starter',
    blurb: '10 keywords, 3 AI engines, and competitor snapshots are now unlocked.',
  },
  pro: {
    name: 'Pro',
    blurb: 'Unlimited keywords, all 5 AI engines, and weekly reports are now unlocked.',
  },
}

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ success?: string; plan?: string }> }) {
  const { success, plan } = await searchParams

  if (success !== '1') redirect('/dashboard')

  const copy = PLAN_COPY[plan ?? ''] ?? PLAN_COPY.pro

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">You&apos;re on {copy.name}!</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
        {copy.blurb} Your 14-day free trial has started.
      </p>
      <Link
        href="/dashboard"
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        Go to dashboard →
      </Link>
    </div>
  )
}
