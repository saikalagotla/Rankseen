import Link from 'next/link'

interface PricingCardProps {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: string
  ctaHref: string
  highlighted?: boolean
  badge?: string
  current?: boolean
}

export default function PricingCard({
  name,
  price,
  period = '/mo',
  description,
  features,
  cta,
  ctaHref,
  highlighted = false,
  badge,
  current = false,
}: PricingCardProps) {
  const effectiveBadge = current ? 'Your plan' : badge

  return (
    <div className={`relative rounded-2xl p-8 flex flex-col gap-6 h-full transition-all duration-200 hover:-translate-y-1 ${
      current
        ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-500 shadow-lg shadow-emerald-500/10'
        : highlighted
        ? 'bg-slate-900 dark:bg-slate-800 text-white ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/10'
        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60'
    }`}>
      {effectiveBadge && (
        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
          current
            ? 'bg-emerald-500 text-white'
            : 'bg-emerald-500 text-white'
        }`}>
          {effectiveBadge}
        </span>
      )}

      <div>
        <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${highlighted ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-500'}`}>
          {name}
        </p>
        <div className="flex items-end gap-1">
          <span className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{price}</span>
          <span className={`text-sm mb-1 ${highlighted ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{period}</span>
        </div>
        <p className={`text-sm mt-2 ${highlighted ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{description}</p>
      </div>

      <ul className="flex flex-col gap-3 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className={highlighted ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={current ? '/dashboard/settings' : ctaHref}
        className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
          current
            ? 'bg-emerald-500 hover:bg-emerald-400 text-white hover:shadow-md hover:shadow-emerald-500/30'
            : highlighted
            ? 'bg-emerald-500 hover:bg-emerald-400 text-white hover:shadow-md hover:shadow-emerald-500/30'
            : 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900'
        }`}
      >
        {current ? 'Manage plan' : cta}
      </Link>
    </div>
  )
}
