'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { initMixpanel, trackPageView, identifyUser } from '@/lib/mixpanel'
import { useUser } from './auth-provider'

export default function MixpanelProvider() {
  const pathname = usePathname()
  const user = useUser()
  const identified = useRef(false)

  useEffect(() => {
    initMixpanel()
  }, [])

  useEffect(() => {
    trackPageView(pathname)
  }, [pathname])

  useEffect(() => {
    if (user && !identified.current) {
      identifyUser(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name ?? user.email,
      })
      identified.current = true
    }
    if (!user) {
      identified.current = false
    }
  }, [user])

  return null
}
