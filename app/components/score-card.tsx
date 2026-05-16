interface ScoreCardProps {
  title: string
  value: string
  subtitle: string
  badge: string
  badgeColor: 'green' | 'orange' | 'yellow' | 'blue'
  icon: React.ReactNode
  locked?: boolean
  animClass?: string
}

export default function ScoreCard({ title, value, subtitle, badge, badgeColor, icon, locked, animClass = '' }: ScoreCardProps) {
  const badgeStyles: Record<string, string> = {
    green:  'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800',
    orange: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-800',
    yellow: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800',
    blue:   'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800',
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3 relative hover:shadow-md dark:hover:shadow-slate-900 hover:-translate-y-0.5 transition-all duration-200 ${locked ? 'overflow-hidden' : ''} ${animClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        <span className="text-slate-400 dark:text-slate-600">{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold text-slate-900 dark:text-white ${locked ? 'blur-sm select-none' : ''}`}>{value}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeStyles[badgeColor]}`}>{badge}</span>
      </div>
    </div>
  )
}
