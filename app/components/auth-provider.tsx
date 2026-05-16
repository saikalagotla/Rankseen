'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
}

const AuthContext = createContext<AuthContextValue>({ user: null })

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase])

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

export function useUser() {
  return useContext(AuthContext).user
}

export function getUserMeta(user: User | null) {
  if (!user) return null
  return {
    name: (user.user_metadata?.full_name as string | undefined)
      ?? (user.user_metadata?.name as string | undefined)
      ?? user.email?.split('@')[0]
      ?? 'User',
    email: user.email ?? '',
    avatar: (user.user_metadata?.avatar_url as string | undefined)
      ?? (user.user_metadata?.picture as string | undefined)
      ?? null,
  }
}
