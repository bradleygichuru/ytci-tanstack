import { useState, useCallback } from 'react'

export interface CursorPaginationState {
  cursor: string | null
  hasMore: boolean
  setCursor: (c: string | null) => void
  setHasMore: (h: boolean) => void
  handleNext: (onPaginate: (cursor: string) => void) => void
  handlePrev: (onPaginate: (cursor: string | null) => void) => void
}

export function useCursorPagination(): CursorPaginationState & { reset: () => void } {
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(false)

  const reset = useCallback(() => {
    setCursorHistory([])
  }, [])

  const handleNext = useCallback((onPaginate: (cursor: string) => void) => {
    if (cursor) {
      setCursorHistory(prev => [...prev, cursor])
      onPaginate(cursor)
    }
  }, [cursor])

  const handlePrev = useCallback((onPaginate: (cursor: string | null) => void) => {
    if (cursorHistory.length === 0) {
      onPaginate(null)
      return
    }
    const next = cursorHistory.slice(0, -1)
    setCursorHistory(next)
    onPaginate(next.length > 0 ? next[next.length - 1] : null)
  }, [cursorHistory])

  return { cursor, hasMore, setCursor, setHasMore, handleNext, handlePrev, reset }
}
