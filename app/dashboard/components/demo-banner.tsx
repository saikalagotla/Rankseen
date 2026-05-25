import Link from 'next/link'

export default function DemoBanner() {
  return (
    <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">You&rsquo;re viewing a demo dashboard</p>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Sign up free to track your own business — no credit card required.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/login" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">Sign in</Link>
        <Link href="/setup" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
          Start free →
        </Link>
      </div>
    </div>
  )
}
