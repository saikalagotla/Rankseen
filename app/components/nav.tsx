'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser, getUserMeta } from './auth-provider'
import ThemeToggle from './theme-toggle'

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()
  const user = useUser()
  const meta = getUserMeta(user)

  async function handleSignOut() {
    setUserMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img src="/logoLight.svg" alt="SpottedHQ" className="block dark:hidden h-10 w-auto" />
          <img src="/logoDark.svg" alt="SpottedHQ" className="hidden dark:block h-10 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <Link href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">Features</Link>
          <Link href="#pricing" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">Pricing</Link>
          <ThemeToggle />

          {meta ? (
            <div className="flex items-center gap-2 ml-1">
              <Link
                href="/dashboard"
                className="text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-all hover:shadow-md hover:shadow-emerald-500/20 active:scale-95"
              >
                Dashboard
              </Link>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
              >
                <UserAvatar name={meta.name} avatar={meta.avatar} size={28} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                  {meta.name.split(' ')[0]}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg z-20 py-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{meta.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{meta.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">Sign in</Link>
              <Link
                href="/setup"
                className="text-sm bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md hover:shadow-emerald-500/20 active:scale-95 ml-1"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          {meta && <UserAvatar name={meta.name} avatar={meta.avatar} size={28} />}
          <button
            className="p-2 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5 transition-transform duration-200" style={{ transform: mobileOpen ? 'rotate(90deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 flex flex-col gap-1">
          <Link href="#features" className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors" onClick={() => setMobileOpen(false)}>Features</Link>
          <Link href="#pricing" className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors" onClick={() => setMobileOpen(false)}>Pricing</Link>

          {meta ? (
            <>
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                <p className="text-xs font-medium text-slate-900 dark:text-white">{meta.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{meta.email}</p>
              </div>
              <Link href="/dashboard" className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <button
                onClick={() => { setMobileOpen(false); handleSignOut() }}
                className="text-left text-sm text-red-600 dark:text-red-400 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors" onClick={() => setMobileOpen(false)}>Sign in</Link>
              <Link href="/setup" className="text-sm bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-medium text-center mt-1 hover:bg-emerald-600 transition-colors" onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

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
