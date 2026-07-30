import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface ModerationActionConfig {
  apiCall: () => Promise<unknown>
  onOptimistic?: () => void
  onRollback?: () => void
  successMsg: string
}

export function useModerationAction() {
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({})
  const [revertedCardId, setRevertedCardId] = useState<string | null>(null)
  const revertTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const completed = useRef<Record<string, boolean>>({})

  const execute = useCallback((id: string | null, config: ModerationActionConfig) => {
    if (!id) return
    if (pendingIds[id]) return

    completed.current[id] = false
    setPendingIds(prev => ({ ...prev, [id]: true }))
    config.onOptimistic?.()

    function handleError(error: unknown) {
      if (completed.current[id]) return
      completed.current[id] = true
      const msg = extractErrorMessage(error)
      config.onRollback?.()
      setRevertedCardId(id)
      if (revertTimers.current[id]) clearTimeout(revertTimers.current[id])
      revertTimers.current[id] = setTimeout(() => setRevertedCardId(null), 800)
      toast.error(msg, {
        action: msg === 'Request timed out. Please try again.'
          ? { label: 'Retry', onClick: () => execute(id, config) }
          : undefined,
        duration: 5000,
      })
    }

    const timeoutId = setTimeout(() => {
      handleError(new Error('Request timed out. Please try again.'))
    }, 15000)

    config.apiCall()
      .then(() => {
        if (completed.current[id]) return
        completed.current[id] = true
        clearTimeout(timeoutId)
        toast.success(config.successMsg)
      })
      .catch(handleError)
      .finally(() => {
        clearTimeout(timeoutId)
        setPendingIds(prev => {
          const n = { ...prev }
          delete n[id]
          return n
        })
      })
  }, [pendingIds])

  return { execute, pendingIds, revertedCardId }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    if (err.error && typeof err.error === 'object') {
      const body = err.error as Record<string, unknown>
      if (typeof body.message === 'string') return body.message
    }
    if (typeof err.message === 'string') return err.message
  }
  return 'An unexpected error occurred. Please try again.'
}
