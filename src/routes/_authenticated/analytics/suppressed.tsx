import { createFileRoute } from '@tanstack/react-router'
import { ShieldCheck } from '@phosphor-icons/react'
import { formatNumber } from '#/lib/analytics/format'
import { useAnalytics } from '#/lib/analytics/store'
import {
  MetricNote,
  Notice,
  OverlayBadge,
  Panel,
  SectionFrame,
  SuppressedMark,
  TableShell,
} from '#/components/analytics/shared'

export const Route = createFileRoute('/_authenticated/analytics/suppressed')({
  component: SuppressedPage,
})

function SuppressedPage() {
  const { suppression } = useAnalytics()

  return (
    <SectionFrame
      section="suppressed"
      dataset="quality"
      ignoreEmpty
      kicker="Analytics · trust"
      title="Suppressed cells"
      sub="Small-cell suppression protects small counties and small cohorts from re-identification. The rule is applied before a cell reaches any screen or export."
    >
      <Notice tone="neutral" title={`Cells under ${suppression.threshold} readers are hidden.`}>
        This table lists the contract cells the rollup withheld for the selected range. A suppressed
        cell is shown as — and is never included in a total.
      </Notice>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Threshold
          </p>
          <p className="mt-1 font-sans text-2xl font-bold text-foreground">{suppression.threshold}</p>
          <p className="mt-1 text-xs text-muted-foreground">Readers per cell</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Cells suppressed
          </p>
          <p className="mt-1 font-sans text-2xl font-bold text-foreground">
            {formatNumber(suppression.cellsSuppressed)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across the selected range</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Rule
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-sans text-sm font-bold text-foreground">
            <ShieldCheck className="h-4 w-4 text-[var(--success-leaf)]" weight="duotone" /> No total
            that reveals a hidden cell
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A total plus one visible cell can reconstruct the hidden value.
          </p>
        </div>
      </div>

      <Panel
        className="mt-4"
        title="Contract cells withheld"
        hint="Real suppressed rows from this rollup"
        bodyClassName="p-0"
      >
        <TableShell
          caption="Suppressed cells reported by the analytics rollup"
          head={
            <>
              <th scope="col" className="px-5 py-3">
                Dataset
              </th>
              <th scope="col" className="px-5 py-3">
                Cell
              </th>
              <th scope="col" className="px-5 py-3">
                Reason
              </th>
            </>
          }
          minWidth={720}
        >
          {suppression.contractCells.map((cell, index) => (
            <tr key={`${cell.dataset}-${cell.label}-${index}`} className="border-b last:border-0">
              <td className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cell.dataset}
              </td>
              <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
                {cell.label}
              </th>
              <td className="px-5 py-3 text-sm text-muted-foreground">{cell.detail}</td>
            </tr>
          ))}
          {suppression.contractCells.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-5 py-8 text-center text-sm text-muted-foreground">
                No cells were suppressed in this range. That is not a claim that every cell is
                large — only that nothing fell under the threshold.
              </td>
            </tr>
          ) : null}
        </TableShell>
      </Panel>

      <Panel
        className="mt-4"
        title="County × feature"
        hint="Illustrative sample of the suppression rule"
        actions={<OverlayBadge label="Sample overlay" />}
        bodyClassName="p-0"
      >
        <TableShell
          caption="Sample county by feature table showing suppressed cells without a total"
          head={
            <>
              <th scope="col" className="px-5 py-3">
                County
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Events
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Recognition
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Learning
              </th>
            </>
          }
          minWidth={560}
        >
          {suppression.demoRows.map((row) => (
            <tr key={row.county} className="border-b last:border-0">
              <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
                {row.county}
              </th>
              <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                {row.events == null ? <SuppressedMark /> : formatNumber(row.events)}
              </td>
              <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                {row.recognition == null ? <SuppressedMark /> : formatNumber(row.recognition)}
              </td>
              <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                {row.learning == null ? <SuppressedMark /> : formatNumber(row.learning)}
              </td>
            </tr>
          ))}
        </TableShell>
        <div className="border-t border-border px-5 py-3">
          <MetricNote>
            “—” means fewer than {suppression.threshold} readers. There is deliberately no total row:
            a total plus one visible cell would reveal the hidden value. This sample is not part of
            the frozen contract and is not affected by the date range.
          </MetricNote>
        </div>
      </Panel>
    </SectionFrame>
  )
}
