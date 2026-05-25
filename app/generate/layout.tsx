import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function GenerateLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.OWNER_EMAIL) {
    redirect('/')
  }

  return <>{children}</>
}
