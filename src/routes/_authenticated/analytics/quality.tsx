import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Trash } from '@phosphor-icons/react'
import {
  METRIC_DEFINITIONS,
  qualitySummary,
  type KpiView,
} from '#/lib/analytics/derive'
import { resolveWindow } from '#/lib/analytics/filters'
import { formatDate, formatNumber, formatRate, todayIso } from '#/lib/analytics/format'
import { useAnalytics } from '#/lib/analytics/store'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  KpiCard,
  MetricDefinitions,
  MetricNote,
  Notice,
  Panel,
  SectionFrame,
  SuppressedMark,
  TableShell,
} from '#/components/analytics/shared'
import { cn } from '#/lib/utils.ts'
import type { ErasureRequest } from '#/lib/analytics/types'

export const Route = createFileRoute('/_authenticated/analytics/quality')({
  component: QualityPage,
})

function qualityKpi(
  key: string,
  label: string,
  value: string,
  foot: string,
  definition: string,
  suppressed = false,
): KpiView {
  return { key, label, value, foot, definition, suppressed }
}

function QualityPage() {
  const { data, filters, searchGap } = useAnalytics()
  const window = resolveWindow(filters.range, todayIso())
  const quality = qualitySummary(data?.quality ?? null, window)

  return (
    <SectionFrame
      section="quality"
      dataset="quality"
      kicker="Analytics · trust"
      title="Data quality"
      sub="Ingest volume, consent coverage, dropped properties and rollup health. Every KPI on every screen carries one of these caveats."
    >
      <Notice tone="neutral" title="What this screen can and cannot say.">
        These are pipeline checks, not product outcomes. Consent-gated analytics over-represents
        engaged readers; the counters below make that visible rather than hiding it in a footnote.
      </Notice>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          kpi={qualityKpi(
            'ingest',
            'Ingest volume',
            quality.eventsPerDay == null ? '—' : `${formatNumber(Math.round(quality.eventsPerDay))}/day`,
            `${formatNumber(data?.quality.ingest.events)} events · ${formatNumber(quality.totalBatches)} batches`,
            'Events accepted by the ingest endpoint in the selected range.',
          )}
        />
        <KpiCard
          kpi={qualityKpi(
            'consent',
            'Consent coverage',
            quality.consentCoverage == null ? '—' : formatRate(quality.consentCoverage),
            'Batches with a current consent version',
            'Granted consent ÷ all consent states. Missing or stale consent is rejected before storage.',
            quality.consentCoverage == null,
          )}
          accent="gold"
        />
        <KpiCard
          kpi={qualityKpi(
            'unknown_keys',
            'Unknown keys',
            quality.unknownKeyRate == null ? '—' : formatRate(quality.unknownKeyRate, 2),
            'Dropped and counted',
            'Unknown property keys ÷ accepted events. Raw key text is never stored.',
            quality.unknownKeyRate == null,
          )}
          accent="gold"
        />
        <KpiCard
          kpi={qualityKpi(
            'queue_drops',
            'Queue drops',
            formatNumber(quality.queueDrops),
            '7-day expiry + client drops',
            'Events dropped by the offline queue, either at the client cap or after the 7-day expiry.',
          )}
          accent={quality.queueDrops > 0 ? 'danger' : 'forest'}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel title="Pipeline checks" hint="Nightly · carried with any export" bodyClassName="p-0">
          <TableShell
            caption="Analytics pipeline checks"
            head={
              <>
                <th scope="col" className="px-4 py-3">
                  Check
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Action
                </th>
              </>
            }
            minWidth={640}
          >
            <tr className="border-b">
              <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Consent missing or stale
              </th>
              <td className="px-4 py-3 text-sm text-muted-foreground">Rejected</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">No event stored</td>
            </tr>
            <tr className="border-b">
              <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Unknown property
              </th>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                Dropped · {formatNumber(data?.quality.ingest.unknownKeys ?? searchGap.qualitySignals.unknownKeys)}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">Counted on this table</td>
            </tr>
            <tr className="border-b">
              <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Under-18 identified analytics
              </th>
              <td className="px-4 py-3 text-sm text-muted-foreground">Off</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                Identifier-free counters only
              </td>
            </tr>
            <tr className="border-b">
              <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Small cells
              </th>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                Threshold {quality.threshold} · {formatNumber(quality.cellsSuppressed)} suppressed
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                Hidden before any screen
              </td>
            </tr>
            <tr>
              <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Retention
              </th>
              <td className="px-4 py-3 text-sm text-muted-foreground">14 months raw · 24 months agg</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                Nightly rollup, monthly partition
              </td>
            </tr>
          </TableShell>
        </Panel>

        <Panel title="Rollup health" hint="Why an empty screen is not a failed one" bodyClassName="p-0">
          <TableShell
            caption="Rollup jobs and their last successful day"
            head={
              <>
                <th scope="col" className="px-4 py-3">
                  Rollup
                </th>
                <th scope="col" className="px-4 py-3">
                  Last day
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
              </>
            }
            minWidth={520}
          >
            {quality.rollups.map((rollup) => (
              <tr key={rollup.rollup ?? 'rollup'} className="border-b last:border-0">
                <th scope="row" className="px-4 py-3 text-left text-xs font-semibold text-foreground">
                  {rollup.rollup ?? '—'}
                </th>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {rollup.lastDay ? formatDate(rollup.lastDay) : <SuppressedMark label="Last day" />}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      rollup.status === 'ok'
                        ? 'border-[var(--success-leaf)] bg-[var(--leaf-bg)] text-[var(--success-leaf)]'
                        : rollup.status === 'failed'
                          ? 'border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300'
                          : 'border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber-deep)]',
                    )}
                  >
                    {rollup.status ?? 'unknown'}
                  </span>
                </td>
              </tr>
            ))}
            {quality.rollups.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No rollup job reported for this range. Empty data is distinct from a failed read.
                </td>
              </tr>
            ) : null}
          </TableShell>
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Last successful rollup:{' '}
            <strong className="text-foreground">
              {quality.lastSuccess ? formatDate(quality.lastSuccess) : 'unknown'}
            </strong>
            {quality.rollupFailed ? ' · a job is marked failed' : ''}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Metric definitions" hint="Carry these with any export">
        <MetricDefinitions rows={METRIC_DEFINITIONS} />
        <div className="mt-3">
          <MetricNote>
            No per-user timelines. Named support access is reason-recorded, 30 days, and never
            includes recognition data.
          </MetricNote>
        </div>
      </Panel>

      <ErasurePanel />
    </SectionFrame>
  )
}

function ErasurePanel() {
  const { can, requestErasure, stale } = useAnalytics()
  const allowed = can('analytics.erasure')
  const [open, setOpen] = useState(false)
  const [subjectType, setSubjectType] = useState<'user' | 'analytics_id'>('user')
  const [subjectRef, setSubjectRef] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ErasureRequest | null>(null)

  const submit = async () => {
    if (pending || !subjectRef.trim()) return
    setPending(true)
    setError(null)
    setResult(null)
    try {
      const response = await requestErasure({
        subjectType,
        subjectRef: subjectRef.trim(),
      })
      setResult(response)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The erasure request was not accepted.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      className="mt-4"
      title="Data-subject erasure"
      hint="Tombstones the analytics identity; aggregates are retained"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={!allowed || stale}
          title={
            !allowed
              ? 'Erasure requests need analytics.erasure.'
              : stale
                ? 'Erasure is disabled while showing stale rollups.'
                : undefined
          }
        >
          <Trash className="h-4 w-4" weight="duotone" /> Request erasure
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        A request tombstones the analytics identity, targets completion within 14 days and discloses
        the 30-day backup cycle. Aggregate rows are retained because they cannot be tied back to a
        person.
      </p>
      {!allowed ? (
        <div className="mt-3">
          <MetricNote>
            Your role can read analytics but cannot request erasure. Ask an administrator.
          </MetricNote>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request analytics erasure</DialogTitle>
            <DialogDescription>
              The subject reference is recorded only for this request. It is never written to an
              analytics event row.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="text-sm font-semibold text-foreground">
              Subject type
              <select
                value={subjectType}
                onChange={(event) => setSubjectType(event.target.value as 'user' | 'analytics_id')}
                className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              >
                <option value="user">User</option>
                <option value="analytics_id">Analytics ID</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-foreground">
              {subjectType === 'user' ? 'User ID' : 'Analytics ID'}
              <input
                value={subjectRef}
                onChange={(event) => setSubjectRef(event.target.value)}
                placeholder={subjectType === 'user' ? 'user_…' : '00000000-0000-4000-8000-000000000000'}
                className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              />
            </label>
          </div>
          {error ? (
            <Notice tone="red" title="Erasure blocked">
              {error}
            </Notice>
          ) : null}
          {result ? (
            <Notice tone="green" title="Erasure accepted">
              Request {result.id} · {result.status} · due by {formatDate(result.targetBy.slice(0, 10))}
            </Notice>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={submit} disabled={pending || !subjectRef.trim()}>
              {pending ? 'Submitting…' : 'Submit request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}
