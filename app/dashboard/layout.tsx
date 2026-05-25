import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import Sidebar from './components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isDemo = !user
  const profile = user ? await getProfile() : null
  const plan = profile?.plan ?? 'free'

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300" style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
      <Sidebar plan={plan} isDemo={isDemo} />
      <div className="flex-1 ml-60 min-h-screen">
        {children}
      </div>
    </div>
  )
}
