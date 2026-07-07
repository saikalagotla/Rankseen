import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getProfile } from '@/lib/profile'
import SettingsForm from './settings-form'

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) redirect('/login')

  const profile = await getProfile()

  return (
    <SettingsForm
      userId={user.id}
      userName={
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split('@')[0] ??
        'User'
      }
      userEmail={user.email ?? ''}
      userAvatar={
        (user.user_metadata?.avatar_url as string | undefined) ??
        (user.user_metadata?.picture as string | undefined) ??
        null
      }
      profile={profile}
    />
  )
}
