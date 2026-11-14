import { useMemo, useState } from 'react'
import { ChartBar, CheckCircle, MapTrifold, WarningCircle, XCircle, DownloadSimple, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Badge } from '#/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { StatusBadge } from '#/components/shared/StatusBadge'
import {
  coverageCsv,
  coverageSummary,
  fixturesCsv,
} from '#/lib/curation'
import type { CoverageResponse } from '#/lib/api/catalog-admin'

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: typeof MapTrifold
  label: string
  value: number | string
  hint: string
  tone?: 'default' | 'good' | 'caution' | 'bad'
}) {
  const toneClass =
    tone === 'good'
      ? 'bg-[var(--leaf-bg)] text-[var(--success-leaf)]'
      : tone === 'caution'
        ? 'bg-[var(--amber-bg)] text-[var(--amber-text,#6c5000)]'
        : tone === 'bad'
          ? 'bg-red-50 text-destructive'
          : 'bg-[var(--surface-2)] text-muted-foreground'
  return (
    <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${toneClass}`}>
          <Icon className="h-4 w-4" weight="duotone" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-2 font-sans text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function CoverageReport({
  data,
  loading,
  onRefresh,
}: {
  data: CoverageResponse | null
  loading: boolean
  onRefresh: () => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const summary = useMemo(
    () => (data ? coverageSummary(data.coverage, data.fixtures) : null),
    [data],
  )
  const rows = useMemo(() => {
    if (!data) return []
    const needle = search.trim().toLowerCase()
    return data.coverage.filter((row) => {
      if (status !== 'all' && row.coverageStatus !== status) return false
      if (!needle) return true
      return (
        row.county.toLowerCase().includes(needle) ||
        row.countyCode.includes(needle)
      )
    })
  }, [data, search, status])

  if (!data || !summary) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
        {loading ? 'Loading coverage…' : 'No coverage data yet.'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">County coverage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Composer-ready counties have at least three reviewed places. Unverified rows count only
            while they are still in the queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => download('coverage.csv', coverageCsv(data.coverage), 'text/csv')}
          >
            <DownloadSimple className="h-4 w-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              download(
                'coverage.json',
                JSON.stringify(
                  { generatedAt: data.generatedAt, summary, coverage: data.coverage, fixtures: data.fixtures },
                  null,
                  2,
                ),
                'application/json',
              )
            }
          >
            <DownloadSimple className="h-4 w-4" /> JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={CheckCircle}
          label="Composer-ready"
          value={summary.covered}
          hint={`${summary.counties} counties · ≥3 reviewed places`}
          tone="good"
        />
        <SummaryCard
          icon={WarningCircle}
          label="Limited"
          value={summary.limited}
          hint="1–2 reviewed places; nearby counties fill gaps"
          tone="caution"
        />
        <SummaryCard
          icon={XCircle}
          label="Not covered"
          value={summary.notCovered}
          hint="No reviewed or unverified candidates"
          tone="bad"
        />
        <SummaryCard
          icon={ChartBar}
          label="Golden fixtures"
          value={`${summary.fixturesReady}/${summary.fixturesTotal}`}
          hint={`${summary.fixturesDue} review${summary.fixturesDue === 1 ? '' : 's'} due within 30 days`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Curated places
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{summary.curated}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Unverified queue
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{summary.unverified}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Queue states
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.queueCounts.pending} pending · {data.queueCounts.draft} draft ·{' '}
            {data.queueCounts.published} published · {data.queueCounts.rejected} rejected
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold text-foreground">All 47 counties</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search county"
                className="h-8 w-48 pl-8"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="covered">Covered</SelectItem>
                <SelectItem value="limited">Limited</SelectItem>
                <SelectItem value="not_covered">Not covered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>County</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Reviewed</TableHead>
              <TableHead className="text-right">Unverified</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.countyCode}>
                <TableCell className="font-medium text-foreground">{row.county}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.countyCode}
                </TableCell>
                <TableCell className="text-right">{row.curatedCount}</TableCell>
                <TableCell className="text-right">{row.unverifiedCount}</TableCell>
                <TableCell className="text-right">{row.totalCount}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      row.coverageStatus === 'covered'
                        ? 'border-[var(--success-leaf)] bg-[var(--leaf-bg)] text-[var(--success-leaf)]'
                        : row.coverageStatus === 'limited'
                          ? 'border-[var(--amber, #fdc003)] bg-[var(--amber-bg)] text-[var(--amber-text,#6c5000)]'
                          : 'border-red-200 bg-red-50 text-destructive'
                    }
                  >
                    {row.coverageStatus === 'not_covered'
                      ? 'Not covered'
                      : row.coverageStatus === 'covered'
                        ? 'Covered'
                        : 'Limited'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No counties match this filter.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">10 golden fixtures</h3>
            <p className="text-xs text-muted-foreground">
              The Home carousel seed and the first curated fixture set.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => download('golden-fixtures.csv', fixturesCsv(data.fixtures), 'text/csv')}
          >
            <DownloadSimple className="h-4 w-4" /> CSV
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fixture</TableHead>
              <TableHead>County</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Composer</TableHead>
              <TableHead>Next review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.fixtures.map((fixture) => (
              <TableRow key={fixture.slug}>
                <TableCell>
                  <div className="font-medium text-foreground">{fixture.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{fixture.slug}</div>
                </TableCell>
                <TableCell>{fixture.county}</TableCell>
                <TableCell>
                  <StatusBadge status={fixture.status} />
                </TableCell>
                <TableCell>
                  {fixture.composerReady ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--success-leaf)]">
                      <CheckCircle className="h-4 w-4" weight="fill" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <XCircle className="h-4 w-4" /> Not ready
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fixture.reviewDate ? fixture.reviewDate.slice(0, 10) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
