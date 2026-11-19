import { createFileRoute } from '@tanstack/react-router'
import { formatNumber, formatRate } from '#/lib/analytics/format'
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

export const Route = createFileRoute('/_authenticated/analytics/content')({
  component: ContentPage,
})

function ContentPage() {
  const { content } = useAnalytics()
  const live = content.provenance === 'contract'

  return (
    <SectionFrame
      section="content"
      dataset="journeys"
      ignoreEmpty
      kicker="Analytics · content"
      title="Content"
      sub="Where readers reach content and where they stop. Live rows come from the same journey rollup as Journeys; the sample shape is labelled when the rollup has no content steps."
    >
      {live ? (
        <Notice tone="green" title="Live content journeys.">
          Counts are the same journey rollup used on Journeys, so the course row reconciles with
          Course completion.
        </Notice>
      ) : (
        <Notice tone="gold" title="No content journeys in this rollup.">
          {content.note}
        </Notice>
      )}

      <Panel
        title="Content journeys"
        hint="View → save → plan for destinations · start → complete for courses"
        actions={live ? undefined : <OverlayBadge />}
        bodyClassName="p-0"
      >
        <TableShell
          caption="Content journeys for destinations and courses"
          head={
            <>
              <th scope="col" className="px-5 py-3">
                Surface
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Started
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Completed
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Completion
              </th>
              <th scope="col" className="px-5 py-3">
                Source
              </th>
            </>
          }
          minWidth={720}
        >
          {content.rows.map((row) => (
            <tr key={row.surface} className="border-b last:border-0">
              <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
                {row.surface}
              </th>
              <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                {formatNumber(row.started)}
              </td>
              <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                {formatNumber(row.completed)}
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                {formatRate(row.completionRate)}
              </td>
              <td className="px-5 py-3 text-sm text-muted-foreground">
                {row.source === 'journeys' ? 'Journey rollup' : 'Sample overlay'}
              </td>
            </tr>
          ))}
        </TableShell>
        {content.rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No content rows for this range. <SuppressedMark label="Content rows" />
          </p>
        ) : null}
      </Panel>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <MetricNote>
          A content row is a journey, not a raw event count. Destination saves and plans are counted
          once per analytics ID, so the row reconciles with Journeys.
        </MetricNote>
        {!live ? (
          <MetricNote>
            The table above is a labelled sample of the intended structure. It is not affected by
            the date range or any other filter, and it is never used to fill a contract KPI.
          </MetricNote>
        ) : null}
      </div>
    </SectionFrame>
  )
}
