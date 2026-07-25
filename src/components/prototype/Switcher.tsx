// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.

import { useCallback, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'

interface SwitcherProps {
  variants: { key: string; label: string }[]
  current: string
}

export function Switcher({ variants, current }: SwitcherProps) {
  const navigate = useNavigate()

  const idx = variants.findIndex((v) => v.key === current)
  const prev = variants[(idx - 1 + variants.length) % variants.length]
  const next = variants[(idx + 1) % variants.length]

  const go = useCallback(
    (key: string) => {
      navigate({ to: '.', search: { variant: key }, replace: true })
    },
    [navigate],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(prev.key)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(next.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [go, prev.key, next.key])

  if (typeof import.meta.env.DEV === 'undefined' || !import.meta.env.DEV) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-neutral-200 bg-white/90 px-5 py-2.5 shadow-lg backdrop-blur-sm">
      <button
        onClick={() => go(prev.key)}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" weight="bold" />
        <span className="hidden sm:inline">{prev.label}</span>
      </button>

      <span className="min-w-[10rem] text-center text-sm font-semibold text-neutral-800">
        {variants.find((v) => v.key === current)?.key ?? current} — {variants.find((v) => v.key === current)?.label}
      </span>

      <button
        onClick={() => go(next.key)}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
      >
        <span className="hidden sm:inline">{next.label}</span>
        <ArrowRight className="h-4 w-4" weight="bold" />
      </button>
    </div>
  )
}
