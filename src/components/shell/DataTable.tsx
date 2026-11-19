/**
 * Shared table shell for admin surfaces.
 *
 * Wraps TanStack Table with the states every admin list needs: loading, error,
 * empty and a footer pagination control. Feature screens supply columns and
 * rows; they do not reimplement table chrome or state handling.
 */
import { useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { CaretDown, CaretLeft, CaretRight, CaretUp, CaretUpDown } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Button } from '#/components/ui/button'
import { DataStateView, deriveDataState, type DataState } from '#/components/shell/DataState'
import { cn } from '#/lib/utils.ts'

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  /** Total rows before client pagination, when the server reports it. */
  total?: number
  isLoading?: boolean
  isError?: boolean
  isOffline?: boolean
  hasCachedData?: boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  pageSize?: number
  /** Optional row click handler; rows become keyboard-activatable. */
  onRowClick?: (row: TData) => void
  /** Force a state instead of deriving it (useful for stories/tests). */
  state?: DataState
  className?: string
  caption?: string
  /**
   * Pin the first column while the table scrolls horizontally. MICE tables use
   * this so the row identity (event, attendee, venue) stays visible when the
   * right-most Actions/evidence column is scrolled into view at 900/1400 or at
   * 200% text.
   */
  stickyFirstColumn?: boolean
}

export function DataTable<TData>({
  columns,
  data,
  total,
  isLoading = false,
  isError = false,
  isOffline = false,
  hasCachedData = false,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  pageSize = 25,
  onRowClick,
  state,
  className,
  caption,
  stickyFirstColumn = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const resolvedState =
    state ??
    deriveDataState({
      isPending: isLoading,
      isError,
      isEmpty: data.length === 0,
      isOffline,
      hasCachedData,
    })

  if (resolvedState !== 'ready') {
    return (
      <DataStateView
        state={resolvedState}
        onRetry={onRetry}
        title={resolvedState === 'empty' ? emptyTitle : undefined}
        description={resolvedState === 'empty' ? emptyDescription : undefined}
        action={resolvedState === 'empty' ? emptyAction : undefined}
        className={className}
      />
    )
  }

  const rows = table.getRowModel().rows
  const pageCount = table.getPageCount()

  return (
    <div
      data-sticky-first={stickyFirstColumn ? 'true' : undefined}
      className={cn(
        'min-w-0 rounded-xl border border-border bg-card',
        className,
      )}
    >
      <Table>
        {caption ? (
          <caption className="px-4 pt-3 text-left text-xs text-muted-foreground">{caption}</caption>
        ) : null}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'px-4',
                      stickyFirstColumn &&
                        index === 0 &&
                        'sticky left-0 z-20 border-r border-border bg-card',
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                        aria-label={`Sort by ${String(header.column.columnDef.header ?? header.column.id)}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <CaretUp className="size-3" weight="bold" />
                        ) : sorted === 'desc' ? (
                          <CaretDown className="size-3" weight="bold" />
                        ) : (
                          <CaretUpDown className="size-3 opacity-50" weight="bold" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn('group', onRowClick && 'cursor-pointer')}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick(row.original)
                      }
                    }
                  : undefined
              }
            >
              {row.getVisibleCells().map((cell, index) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    'px-4',
                    stickyFirstColumn &&
                      index === 0 &&
                      'sticky left-0 z-10 border-r border-border bg-card group-hover:bg-muted',
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {pageCount}
            {typeof total === 'number' ? ` · ${total} total` : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <CaretLeft className="size-3.5" weight="bold" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next <CaretRight className="size-3.5" weight="bold" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
