'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser, getUserMeta } from '../../components/auth-provider'
import ThemeToggle from '../../components/theme-toggle'

const navItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/maps',
    label: 'Google Maps',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/ai',
    label: 'AI Visibility',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/citations',
    label: 'Citations',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/reviews',
    label: 'Reviews',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function UserAvatar({ name, avatar, size = 32 }: { name: string; avatar: string | null; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

export default function Sidebar({ plan }: { plan: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useUser()
  const meta = getUserMeta(user)
  const isPro = plan === 'pro' || plan === 'freelancer'
  const [upgrading, setUpgrading] = React.useState(false)

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch {
      setUpgrading(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-slate-900 dark:bg-slate-950 flex flex-col z-40">
      {/* Logo + Theme toggle */}
      <div className="px-6 h-16 flex items-center justify-between border-b border-slate-800 dark:border-slate-800/80 shrink-0">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-white">Rank</span>
          <span className="text-emerald-400">Seen</span>
        </Link>
        <ThemeToggle className="text-slate-400 hover:text-white hover:bg-slate-800" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 dark:bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Upgrade badge — only for non-Pro users */}
      {!isPro && (
        <div className="px-4 pb-3 shrink-0">
          <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-xl p-4">
            <p className="text-white text-xs font-semibold mb-1">Solo Plan</p>
            <p className="text-emerald-300 text-xs mb-3">Upgrade to unlock AI visibility and review monitoring.</p>
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full text-center bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              {upgrading ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      )}

      {/* User section */}
      {meta && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar name={meta.name} avatar={meta.avatar} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{meta.name}</p>
              <p className="text-xs text-slate-400 truncate">{meta.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 text-slate-400 hover:text-white text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </aside>
  )
}
