import { useState, useCallback } from 'react'

export interface CursorPaginationState {
  cursor: string | null
  hasMore: boolean
  setCursor: (c: string | null) => void
  setHasMore: (h: boolean) => void
  handleNext: (onPaginate: (cursor: string) => void) => void
  handlePrev: (onPaginate: (cursor: string | null) => void) => void
}

export function useCursorPagination(): CursorPaginationState {
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(false)

  const handleNext = useCallback((onPaginate: (cursor: string) => void) => {
    if (cursor) {
      setCursorHistory(prev => [...prev, cursor])
      onPaginate(cursor)
    }
  }, [cursor])

  const handlePrev = useCallback((onPaginate: (cursor: string | null) => void) => {
    const prev = cursorHistory[cursorHistory.length - 1]
    if (prev === undefined) {
      setCursorHistory([])
      onPaginate(null)
      return
    }
    const prevCursor = cursorHistory.length > 1 ? cursorHistory[cursorHistory.length - 2] : null
    setCursorHistory(prev => prev.slice(0, -1))
    onPaginate(prevCursor)
  }, [cursorHistory])

  return { cursor, hasMore, setCursor, setHasMore, handleNext, handlePrev }
}
