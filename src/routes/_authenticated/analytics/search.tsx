import { createFileRoute } from '@tanstack/react-router'
import { qualitySummary } from '#/lib/analytics/derive'
import { resolveWindow } from '#/lib/analytics/filters'
import { formatNumber, formatRate, todayIso } from '#/lib/analytics/format'
import { CONTRACT_GAP_NOTE } from '#/lib/analytics/fixtures'
import { useAnalytics } from '#/lib/analytics/store'
import {
  ContractGapBadge,
  KpiCard,
  MetricNote,
  Notice,
  OverlayBadge,
  Panel,
  SectionFrame,
  TableShell,
} from '#/components/analytics/shared'
import type { KpiView } from '#/lib/analytics/derive'

export const Route = createFileRoute('/_authenticated/analytics/search')({
  component: SearchGapsPage,
})

function missingKpi(key: string, label: string, definition: string): KpiView {
  return {
    key,
    label,
    value: '—',
    foot: 'Not in contract 1.0.0',
    definition,
    suppressed: true,
  }
}

function SearchGapsPage() {
  const { searchGap, data, filters } = useAnalytics()
  const window = resolveWindow(filters.range, todayIso())
  const quality = qualitySummary(data?.quality ?? null, window)

  return (
    <SectionFrame
      section="search"
      dataset="quality"
      ignoreEmpty
      kicker="Analytics · content gaps"
      title={
        <>
          Search gaps <ContractGapBadge />
        </>
      }
      sub="What the rollup can and cannot say about search. No raw query text is stored, and analytics 1.0.0 does not expose the search metrics, so this screen names the gap rather than inventing a zero."
    >
      <Notice tone="gold" title="Search insight is a contract gap, not an empty result.">
        {CONTRACT_GAP_NOTE} The data-quality counters below are real: they show that search events
        are reaching the pipeline even though the search aggregate is not exposed.
      </Notice>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          kpi={missingKpi(
            'zero_result',
            'Zero-result rate',
            'Searches that returned no result, weighted by editor-assigned cluster.',
          )}
        />
        <KpiCard
          kpi={missingKpi(
            'external_selection',
            'External selection',
            'Searches where the reader chose an external result instead of a catalogue record.',
          )}
        />
        <KpiCard
          kpi={missingKpi(
            'median_results',
            'Median results',
            'Median result count before the reader selected an item.',
          )}
        />
        <KpiCard
          kpi={missingKpi(
            'query_clusters',
            'Query clusters',
            'Editor-assigned categories over query-length buckets, result counts and hashes.',
          )}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Signals the pipeline does expose" hint="Data-quality counters · selected range">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Unknown property keys
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                {formatNumber(searchGap.qualitySignals.unknownKeys)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Dropped events
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                {formatNumber(searchGap.qualitySignals.droppedEvents)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Rejected batches
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                {formatNumber(searchGap.qualitySignals.rejectedBatches)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Consent coverage
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                {quality.consentCoverage == null ? '—' : formatRate(quality.consentCoverage)}
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            <MetricNote>
              These are ingestion counters, not search outcomes. They cannot tell a reader why a
              search failed.
            </MetricNote>
          </div>
        </Panel>

        <Panel title="What is stored" hint="ADR 0016 · property allow-list">
          <p className="text-sm text-muted-foreground">
            Search logs surface, query-length bucket, result count, selected rank, external-selection
            flag and a query hash — <strong className="text-foreground">never raw query text</strong>.
            The missing metrics are aggregates over those fields. Adding them is an additive contract
            change in <code>ytci-go</code>, followed by a vendored YAML update and fixtures.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <OverlayBadge label="No raw text" />
            <OverlayBadge label="Hashes + buckets only" />
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Metrics still needed" hint="Named here so the gap is actionable" bodyClassName="p-0">
        <TableShell
          caption="Search metrics that analytics 1.0.0 does not expose"
          head={
            <>
              <th scope="col" className="px-5 py-3">
                Metric
              </th>
              <th scope="col" className="px-5 py-3">
                Definition
              </th>
            </>
          }
          minWidth={640}
        >
          {searchGap.missing.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
                {row.label}
              </th>
              <td className="px-5 py-3 text-sm text-muted-foreground">{row.definition}</td>
            </tr>
          ))}
        </TableShell>
      </Panel>
    </SectionFrame>
  )
}
