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
      className={cn(
        // Content-driven wrap: the action group drops below the title when the
        // two cannot share a line, whatever the cause (narrow viewport or 200%
        // text). A `sm:` breakpoint keeps them in one row even when the text
        // itself no longer fits.
        'flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4',
        className,
      )}
    >
      <div className="min-w-0 flex-1 basis-[min(100%,24rem)]">
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
      {actions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
