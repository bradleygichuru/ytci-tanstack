/**
 * Lose-no-work guard for the species editor.
 *
 * Router navigation and a browser unload both pass through the same dirty flag.
 * `proceed` only runs after the author confirms; the draft is never discarded by
 * a navigation the author cancelled.
 */
import { useCallback, useState, type ReactNode } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { cn } from '#/lib/utils'

export interface DirtyGuard {
  dirty: boolean
  /** Ask before a local action that would replace the draft. */
  confirmDiscard: () => void
  dialog: ReactNode
  statusLabel: string
}

export function useDirtyGuard(options: { dirty: boolean; onDiscard: () => void }): DirtyGuard {
  const { dirty, onDiscard } = options
  const [confirming, setConfirming] = useState(false)
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: () => dirty,
  })

  const confirmDiscard = useCallback(() => {
    setConfirming(true)
  }, [])

  const close = useCallback(() => {
    setConfirming(false)
    if (blocker.status === 'blocked') blocker.reset()
  }, [blocker])

  const confirm = useCallback(() => {
    setConfirming(false)
    onDiscard()
    if (blocker.status === 'blocked') {
      blocker.proceed()
    }
  }, [blocker, onDiscard])

  const blocked = blocker.status === 'blocked' || confirming

  return {
    dirty,
    confirmDiscard,
    statusLabel: dirty ? 'Unsaved changes' : 'All changes saved',
    dialog: (
      <ConfirmDialog
        open={blocked}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title="Discard unsaved changes?"
        description="The editor has edits that are not saved to this species. Leaving restores the last saved values. The retained draft stays in this browser until you discard it."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={confirm}
      />
    ),
  }
}

export function DirtyStatus({ dirty }: { dirty: boolean }) {
  return (
    <span
      className={cn(
        'text-xs font-semibold',
        dirty ? 'text-destructive' : 'text-muted-foreground',
      )}
      role="status"
      aria-live="polite"
    >
      {dirty ? 'Unsaved changes' : 'All changes saved'}
    </span>
  )
}
