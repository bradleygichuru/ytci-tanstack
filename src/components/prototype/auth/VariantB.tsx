// THROWAWAY — UI prototype for ticket #10.
// Variant B — Split-screen: left forest green panel, right white form.

import { Tree, MapPin, Compass } from '@phosphor-icons/react'
import { BrandHeader, authForms, pageTitles, PageNav } from './AuthLayout'
import type { AuthPageProps } from './AuthLayout'

export function VariantB({ page, onPageChange }: AuthPageProps) {
  const info = pageTitles[page]

  return (
    <div className="flex min-h-screen">
      {/* LEFT: Forest green brand panel */}
      <div className="hidden w-1/2 flex-col items-center justify-center p-12 lg:flex" style={{ backgroundColor: 'var(--forest)' }}>
        <div className="max-w-sm text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Tree className="h-8 w-8 text-white" weight="duotone" />
            </div>
          </div>
          <BrandHeader variant="B" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">
            Command Center
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: MapPin, text: 'Monitor eco-tourism metrics in real time' },
              { icon: Compass, text: 'Manage destinations and content across all 47 counties' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-left text-sm text-white/80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <item.icon className="h-4 w-4 text-[var(--amber)]" weight="duotone" />
                </div>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Form */}
      <div className="flex w-full flex-col items-center justify-center bg-white p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--on-surface)' }}>{info.title}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{info.subtitle}</p>
          </div>

          <div className="mb-6">
            <PageNav page={page} onPageChange={onPageChange} variant="B" />
          </div>

          {authForms[page]}

          {page === 'login' && (
            <p className="mt-4 text-center text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              Don&apos;t have an account?{' '}
              <a href="#" className="font-semibold hover:underline" style={{ color: 'var(--leaf)' }}>Contact support</a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
