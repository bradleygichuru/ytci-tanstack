import { Tree, MapPin, Compass } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  nav?: { label: string; href: string; active: boolean }[]
}

export function AuthLayout({ title, subtitle, children, nav }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col items-center justify-center p-12 lg:flex" style={{ backgroundColor: '#154212' }}>
        <div className="max-w-sm text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Tree className="h-8 w-8 text-white" weight="duotone" />
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">Eco-Explorer</h1>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">Admin Portal</p>

          <div className="mt-10 space-y-4">
            {[
              { icon: MapPin, text: 'Monitor eco-tourism metrics in real time' },
              { icon: Compass, text: 'Manage destinations and content across 47 counties' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-left text-sm text-white/80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <item.icon className="h-4 w-4 text-[#fdc002]" weight="duotone" />
                </div>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-white p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#191c1d' }}>{title}</h2>
            <p className="mt-1 text-sm" style={{ color: '#42493e' }}>{subtitle}</p>
          </div>

          {nav && nav.length > 0 && (
            <div className="mb-6 flex items-center gap-4 text-xs font-semibold text-[#42493e]">
              {nav.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`pb-1 ${item.active ? 'border-b-2 border-[#154212] text-[#191c1d]' : ''}`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}
