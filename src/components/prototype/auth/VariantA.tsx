// THROWAWAY — UI prototype for ticket #10.
// Variant A — Centered card with brand illustration on light gray bg.

import { Tree, GlobeHemisphereWest, Leaf } from '@phosphor-icons/react'
import { BrandHeader, authForms, pageTitles, PageNav, AUTH_VARIANTS } from './AuthLayout'
import type { AuthPageProps } from './AuthLayout'
import { Switcher } from '../Switcher'

export function VariantA({ page, onPageChange }: AuthPageProps) {
  const info = pageTitles[page]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ backgroundColor: '#f8f9fa' }}>
      <div
        className="w-full max-w-md overflow-hidden rounded-lg bg-white"
        style={{ boxShadow: '0px 2px 12px rgba(21, 66, 18, 0.06)' }}
      >
        {/* Brand header */}
        <div className="flex flex-col items-center justify-center py-10 text-center" style={{ backgroundColor: '#f8f9fa' }}>
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--forest)' }}>
              <Tree className="h-6 w-6 text-white" weight="duotone" />
            </div>
          </div>
          <BrandHeader variant="A" />
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: 'var(--on-surface-variant)' }}>
            Command Center
          </p>
        </div>

        {/* Card body */}
        <div className="px-10 pb-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--on-surface)' }}>{info.title}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{info.subtitle}</p>
          </div>

          <div className="mb-6">
            <PageNav page={page} onPageChange={onPageChange} variant="A" />
          </div>

          {authForms[page]}
        </div>
      </div>

      <p className="mt-6 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        © 2024 Eco-Tourism Explorer. All rights reserved.
      </p>
    </div>
  )
}
