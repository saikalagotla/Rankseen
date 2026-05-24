'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '../components/theme-toggle'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const urlError = searchParams.get('error')

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${callbackUrl}`,
      },
    })
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    const supabase = createClient()

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        router.push(callbackUrl)
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${callbackUrl}` },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setSuccessMsg('Check your email for a confirmation link.')
        setLoading(false)
      }
    }
  }

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300"
      style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}
    >
      <header className="px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Spotted<span className="text-emerald-500">HQ</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {mode === 'signin' ? 'Sign in to SpottedHQ' : 'Create your account'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Track your Google Maps rank, AI visibility, and citation health.
            </p>

            {(urlError || error) && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
                {error ?? 'Sign-in failed. Please try again.'}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl px-4 py-3 mb-5">
                {successMsg}
              </div>
            )}

            {/* Email/password form */}
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3 mb-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm py-3 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm py-3 px-4 rounded-xl transition-all hover:shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
              {mode === 'signin' ? (
                <>No account?{' '}
                  <button onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null) }} className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null) }} className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </p>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
              By continuing, you agree to our{' '}
              <span className="underline cursor-pointer">Terms</span> and{' '}
              <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
