import { getProfile } from '@/lib/profile'
import Sidebar from './components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  const plan = profile?.plan ?? 'solo'

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300" style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
      <Sidebar plan={plan} />
      <div className="flex-1 ml-60 min-h-screen">
        {children}
      </div>
    </div>
  )
}
