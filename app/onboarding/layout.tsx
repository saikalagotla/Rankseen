export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center mb-10">
          <a href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-slate-900 dark:text-white">Rank</span>
            <span className="text-emerald-500">Seen</span>
          </a>
        </div>
        {children}
      </div>
    </div>
  )
}
