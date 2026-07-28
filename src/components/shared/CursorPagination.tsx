import { CaretLeft, CaretRight } from '@phosphor-icons/react'

interface CursorPaginationProps {
  nextCursor: string | null
  hasMore: boolean
  onNext: () => void
  onPrev: () => void
  loading?: boolean
  total?: number
}

export function CursorPagination({ nextCursor, hasMore, onNext, onPrev, loading, total }: CursorPaginationProps) {
  const atStart = !nextCursor && !hasMore
  const atEnd = !hasMore

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3">
      <span className="text-xs text-[var(--on-surface-variant)]">
        {total !== undefined ? `${total} total` : ''}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={atStart || loading}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
        >
          <CaretLeft className="h-3.5 w-3.5" weight="bold" /> Previous
        </button>
        <button
          onClick={onNext}
          disabled={atEnd || loading}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
        >
          {loading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--forest)] border-t-transparent" /> : 'Next'}
          <CaretRight className="h-3.5 w-3.5" weight="bold" />
        </button>
      </div>
    </div>
  )
}
