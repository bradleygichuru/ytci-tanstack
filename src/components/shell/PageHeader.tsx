/**
 * Shared page header.
 *
 * Section title, one-line purpose, and an actions slot for the surface's primary
 * action. The action is passed by the screen so permission gating stays with the
 * caller (`<Can permission="…">`).
 */
import type { ReactNode } from 'react'
import { cn } from '#/lib/utils.ts'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Owning stream/ticket, shown while a surface is a shell placeholder. */
  owner?: string
  badge?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  owner,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn('flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge}
          {owner ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {owner}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
