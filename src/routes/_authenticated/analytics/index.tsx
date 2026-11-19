import { createFileRoute, Link } from '@tanstack/react-router'
import {
  activeReaderKpi,
  activationKpi,
  dailyCaption,
  dailySeries,
  guestToAccountKpi,
  newAccountsKpi,
  qualitySummary,
  topJourneys,
} from '#/lib/analytics/derive'
import { resolveWindow } from '#/lib/analytics/filters'
import { formatNumber, formatRate, todayIso } from '#/lib/analytics/format'
import { useAnalytics } from '#/lib/analytics/store'
import {
  ActiveReadersChart,
  JourneyBar,
  KpiCard,
  MetricNote,
  Notice,
  Panel,
  SectionFrame,
  SuppressedMark,
  TableShell,
} from '#/components/analytics/shared'

export const Route = createFileRoute('/_authenticated/analytics/')({
  component: OverviewPage,
})

function OverviewPage() {
  const { data, filters, searchGap } = useAnalytics()
  const window = resolveWindow(filters.range, todayIso())
  const overview = data?.overview ?? null
  const series = dailySeries(overview)
  const journeys = topJourneys(data?.journeys ?? [], 5)
  const quality = qualitySummary(data?.quality ?? null, window)

  return (
    <SectionFrame
      section="overview"
      dataset="overview"
      kicker="Analytics · product health"
      title="Overview"
      sub="Activation, active readers and data quality for the selected range. These are product-health signals, not programme impact."
    >
      <Notice tone="green" title="Product health, not programme impact.">
        Programme numbers come from domain tables, never from telemetry. Use Programme for the
        impact view and Data quality for the rollup caveats.
      </Notice>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard kpi={activationKpi(overview)} />
        <KpiCard kpi={activeReaderKpi(overview)} compact />
        <KpiCard kpi={guestToAccountKpi(overview)} />
        <KpiCard kpi={newAccountsKpi(overview)} />
      </div>

      <div className="mt-3">
        <MetricNote>
          Every KPI on this screen is read from the same filtered rollup. There are no invariant
          cards and no county or platform filter: the frozen contract exposes neither dimension.
        </MetricNote>
      </div>

      <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <Panel
              title="Active readers"
              hint={`${window.label} · daily active readers (DAU) · same population as the KPI`}
            >
              <ActiveReadersChart series={series} windowLabel={window.label} />
              <div className="mt-3 text-xs text-muted-foreground">{dailyCaption(series, window)}</div>
            </Panel>

            <Panel
              title="Highest completion"
              hint="Ranked by completion rate · n = started readers"
              actions={
                <Link
                  to="/analytics/journeys"
                  className="rounded-sm text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  View all 9
                </Link>
              }
            >
              {journeys.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No journey steps were returned for this range.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {journeys.map((journey) => (
                    <JourneyBar key={journey.journey} journey={journey} />
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Identical source to Journeys. A suppressed step is shown as — rather than as 0%.
              </p>
            </Panel>
          </div>

          <Panel
            className="mt-4"
            title="Data quality"
            hint="Nightly checks carried with the rollup"
            actions={
              <Link
                to="/analytics/quality"
                className="rounded-sm text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                Open data quality
              </Link>
            }
            bodyClassName="p-0"
          >
            <TableShell
              caption="Data quality checks for the selected range"
              head={
                <>
                  <th scope="col" className="px-5 py-3">
                    Check
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Result
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Note
                  </th>
                </>
              }
              minWidth={560}
            >
              <tr className="border-b">
                <th scope="row" className="px-5 py-3 text-left text-xs font-semibold text-foreground">
                  Consent coverage
                </th>
                <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums">
                  {quality.consentCoverage == null ? (
                    <SuppressedMark label="Consent coverage" />
                  ) : (
                    formatRate(quality.consentCoverage)
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  Batches without consent are rejected before storage.
                </td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="px-5 py-3 text-left text-xs font-semibold text-foreground">
                  Unknown property keys
                </th>
                <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums">
                  {quality.unknownKeyRate == null ? (
                    <SuppressedMark label="Unknown key rate" />
                  ) : (
                    formatRate(quality.unknownKeyRate, 2)
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  Dropped and counted; raw key text is never stored.
                </td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="px-5 py-3 text-left text-xs font-semibold text-foreground">
                  Offline queue drops
                </th>
                <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums">
                  {formatNumber(quality.queueDrops)}
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  Oldest events over the 7-day queue expiry.
                </td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="px-5 py-3 text-left text-xs font-semibold text-foreground">
                  Small-cell suppression
                </th>
                <td className="px-5 py-3 text-right text-sm font-semibold">
                  {quality.cellsSuppressed > 0 ? `${quality.cellsSuppressed} cells` : 'Active'}
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  Cells under {quality.threshold} readers are hidden before this screen.
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-3 text-left text-xs font-semibold text-foreground">
                  Search telemetry
                </th>
                <td className="px-5 py-3 text-right text-sm font-semibold">
                  {searchGap.provenance === 'unavailable' ? 'Not in contract' : 'Reported'}
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  Search gaps are a documented contract gap, not zero searches.
                </td>
              </tr>
            </TableShell>
          </Panel>
      </>
    </SectionFrame>
  )
}
