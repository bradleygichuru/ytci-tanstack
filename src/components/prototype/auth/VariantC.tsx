// THROWAWAY — UI prototype for ticket #10.
// Variant C — Minimal / no card: brand floating on forest green bg, bare white/pill form.

import { Tree, GlobeHemisphereWest } from '@phosphor-icons/react'
import { BrandHeader, authForms, pageTitles, PageNav } from './AuthLayout'
import type { AuthPageProps } from './AuthLayout'

export function VariantC({ page, onPageChange }: AuthPageProps) {
  const info = pageTitles[page]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--forest)' }}>
      <div className="w-full max-w-sm">
        {/* Floating brand */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <Tree className="h-7 w-7 text-white" weight="duotone" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Eco-Explorer</h1>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">
            Admin Portal
          </p>
        </div>

        {/* Page nav on forest bg */}
        <div className="mb-6">
          <PageNav page={page} onPageChange={onPageChange} variant="C" />
        </div>

        {/* Title on forest bg */}
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold text-white">{info.title}</h2>
          <p className="mt-1 text-sm text-white/70">{info.subtitle}</p>
        </div>

        {/* Forms directly on the green background — pill-style white inputs */}
        <div className="space-y-5">
          {page === 'login' && (
            <>
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 outline-none transition-all focus:border-white/60 focus:bg-white/20"
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 outline-none transition-all focus:border-white/60 focus:bg-white/20"
              />
              <button
                className="w-full rounded-full bg-white py-3 text-sm font-bold shadow-sm transition-colors hover:bg-white/90"
                style={{ color: 'var(--forest-deep)' }}
              >
                Sign In
              </button>
              <div className="text-center">
                <button className="text-xs font-semibold text-white/60 hover:text-white">
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {page === 'forgot' && (
            <>
              <p className="text-center text-sm leading-relaxed text-white/70">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 outline-none transition-all focus:border-white/60 focus:bg-white/20"
              />
              <button
                className="w-full rounded-full bg-white py-3 text-sm font-bold shadow-sm transition-colors hover:bg-white/90"
                style={{ color: 'var(--forest-deep)' }}
              >
                Send Reset Link
              </button>
            </>
          )}

          {page === 'reset' && (
            <>
              <input
                type="password"
                placeholder="New password"
                className="w-full rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 outline-none transition-all focus:border-white/60 focus:bg-white/20"
              />
              <input
                type="password"
                placeholder="Confirm password"
                className="w-full rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 outline-none transition-all focus:border-white/60 focus:bg-white/20"
              />
              <button
                className="w-full rounded-full bg-white py-3 text-sm font-bold shadow-sm transition-colors hover:bg-white/90"
                style={{ color: 'var(--forest-deep)' }}
              >
                Reset Password
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-10 text-xs text-white/40">
        © 2024 Eco-Tourism Explorer
      </p>
    </div>
  )
}
