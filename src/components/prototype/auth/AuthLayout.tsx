// THROWAWAY — UI prototype for ticket #10.
// Lives on branch prototype/auth-design. Throw away when verdict is captured.
// Shared auth form components used by all 3 variants.

import type { ReactNode } from 'react'
import { Switcher } from '../Switcher'

export interface AuthPageProps {
  page: 'login' | 'forgot' | 'reset'
  onPageChange: (page: 'login' | 'forgot' | 'reset') => void
}

export const AUTH_VARIANTS = [
  { key: 'A', label: 'Centered card + brand' },
  { key: 'B', label: 'Split-screen' },
  { key: 'C', label: 'Minimal / no card' },
]

function LoginForm() {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Email</label>
        <input
          type="email"
          placeholder="admin@example.com"
          className="w-full rounded-lg border px-4 py-3 text-sm text-[var(--on-surface)] outline-none transition-all placeholder:text-[var(--on-surface-variant)]"
          style={{ borderColor: 'var(--outline-muted)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--forest)'; e.target.style.boxShadow = '0 0 0 2px rgba(21,66,18,0.15)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--outline-muted)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Password</label>
          <button className="text-xs font-semibold hover:underline" style={{ color: 'var(--leaf)' }}>
            Forgot password?
          </button>
        </div>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full rounded-lg border px-4 py-3 text-sm text-[var(--on-surface)] outline-none transition-all placeholder:text-[var(--on-surface-variant)]"
          style={{ borderColor: 'var(--outline-muted)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--forest)'; e.target.style.boxShadow = '0 0 0 2px rgba(21,66,18,0.15)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--outline-muted)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <button
        className="w-full rounded-full py-3 text-sm font-bold text-white shadow-sm transition-colors"
        style={{ backgroundColor: 'var(--forest)' }}
      >
        Sign In
      </button>
    </div>
  )
}

function ForgotForm() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
        Enter the email address associated with your account and we'll send you a link to reset your password.
      </p>
      <div>
        <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Email</label>
        <input
          type="email"
          placeholder="admin@example.com"
          className="w-full rounded-lg border px-4 py-3 text-sm text-[var(--on-surface)] outline-none transition-all placeholder:text-[var(--on-surface-variant)]"
          style={{ borderColor: 'var(--outline-muted)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--forest)'; e.target.style.boxShadow = '0 0 0 2px rgba(21,66,18,0.15)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--outline-muted)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <button
        className="w-full rounded-full py-3 text-sm font-bold text-white shadow-sm transition-colors"
        style={{ backgroundColor: 'var(--forest)' }}
      >
        Send Reset Link
      </button>
    </div>
  )
}

function ResetForm() {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>New Password</label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full rounded-lg border px-4 py-3 text-sm text-[var(--on-surface)] outline-none transition-all placeholder:text-[var(--on-surface-variant)]"
          style={{ borderColor: 'var(--outline-muted)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--forest)'; e.target.style.boxShadow = '0 0 0 2px rgba(21,66,18,0.15)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--outline-muted)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Confirm Password</label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full rounded-lg border px-4 py-3 text-sm text-[var(--on-surface)] outline-none transition-all placeholder:text-[var(--on-surface-variant)]"
          style={{ borderColor: 'var(--outline-muted)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--forest)'; e.target.style.boxShadow = '0 0 0 2px rgba(21,66,18,0.15)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--outline-muted)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <button
        className="w-full rounded-full py-3 text-sm font-bold text-white shadow-sm transition-colors"
        style={{ backgroundColor: 'var(--forest)' }}
      >
        Reset Password
      </button>
    </div>
  )
}

export const authForms: Record<string, ReactNode> = {
  login: <LoginForm />,
  forgot: <ForgotForm />,
  reset: <ResetForm />,
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  login: { title: 'Welcome back', subtitle: 'Sign in to your admin account to continue.' },
  forgot: { title: 'Forgot password', subtitle: 'No worries — we\'ll send you a reset link.' },
  reset: { title: 'Set new password', subtitle: 'Must be at least 8 characters.' },
}

function BrandHeader({ variant }: { variant: string }) {
  const isDark = variant !== 'A'
  return (
    <div className="text-center">
      <h1
        className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : ''}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: isDark ? undefined : 'var(--on-surface)' }}
      >
        Eco-Explorer
      </h1>
      <p
        className={`mt-2 text-[11px] font-bold uppercase tracking-[0.25em] ${isDark ? 'text-white/60' : ''}`}
        style={{ color: isDark ? undefined : 'var(--on-surface-variant)' }}
      >
        Admin Portal
      </p>
    </div>
  )
}

function PageNav({ page, onPageChange, variant }: { page: string; onPageChange: (p: 'login' | 'forgot' | 'reset') => void; variant: string }) {
  const isDark = variant !== 'A'
  const tintClass = isDark ? 'text-white/70' : 'text-[var(--on-surface-variant)]'
  return (
    <div className={`flex items-center justify-center gap-4 text-xs font-semibold ${tintClass}`}>
      <button
        onClick={() => onPageChange('login')}
        className={`pb-1 ${page === 'login' ? (isDark ? 'border-b-2 border-white text-white' : 'border-b-2 border-[var(--forest)] text-[var(--on-surface)]') : ''}`}
      >
        Sign In
      </button>
      <button
        onClick={() => onPageChange('forgot')}
        className={`pb-1 ${page === 'forgot' ? (isDark ? 'border-b-2 border-white text-white' : 'border-b-2 border-[var(--forest)] text-[var(--on-surface)]') : ''}`}
      >
        Forgot
      </button>
      <button
        onClick={() => onPageChange('reset')}
        className={`pb-1 ${page === 'reset' ? (isDark ? 'border-b-2 border-white text-white' : 'border-b-2 border-[var(--forest)] text-[var(--on-surface)]') : ''}`}
      >
        Reset
      </button>
    </div>
  )
}

export { BrandHeader, PageNav, pageTitles }
