import { X } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatScore(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return value.toFixed(1)
}

export function percent(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return `${Math.round(value)}%`
}

export function titleCase(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function Stat({
  label,
  value,
  foot,
  icon: Icon,
}: {
  label: string
  value: string | number
  foot?: string
  icon?: Icon
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      </div>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
      {foot ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{foot}</p> : null}
    </div>
  )
}

export function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words font-medium text-foreground">{value}</dd>
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Panel({
  kicker,
  title,
  description,
  onClose,
  children,
  footer,
  width = '2xl',
}: {
  kicker: string
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: 'md' | '2xl' | '3xl'
}) {
  const maxWidth = width === 'md' ? 'max-w-xl' : width === '3xl' ? 'max-w-4xl' : 'max-w-2xl'
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <div
        className={cn(
          'flex h-full w-full flex-col overflow-y-auto bg-background p-6 shadow-2xl',
          maxWidth,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {kicker}
            </p>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
            {description ? (
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close panel">
            <X />
          </Button>
        </div>
        <div className="mt-5 flex-1 space-y-5">{children}</div>
        {footer ? (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

export function LoadingRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
        {label}
      </td>
    </tr>
  )
}

export const TABLE_HEAD =
  'bg-muted/50 text-[11px] uppercase tracking-[0.12em] text-muted-foreground'

export const TABLE_CELL = 'px-4 py-3'

export const INPUT =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring disabled:opacity-50'
