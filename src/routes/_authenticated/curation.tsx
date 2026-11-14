import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouteContext } from '@tanstack/react-router'
import { toast } from 'sonner'
import { MagnifyingGlass, MapTrifold, ClipboardText, ArrowClockwise } from '@phosphor-icons/react'
import { requirePermission } from '#/lib/authz'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
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
import { ReviewPanel } from '#/components/catalog/ReviewPanel'
import { CoverageReport } from '#/components/catalog/CoverageReport'
import {
  CatalogApiError,
  catalogAdminApi,
  type CandidateResponse,
  type CoverageResponse,
  type QueueResponse,
} from '#/lib/api/catalog-admin'
import {
  CURATION_STATUSES,
  evaluateComposerReadiness,
  type CurationStatus,
  type ReadinessResult,
  type ReviewFields,
} from '#/lib/curation'

export const Route = createFileRoute('/_authenticated/curation')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'catalog', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: CurationPage,
})

type Tab = 'queue' | 'coverage'

function EmptyReview() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--leaf-bg)]">
        <ClipboardText className="h-6 w-6 text-[var(--success-leaf)]" weight="duotone" />
      </div>
      <h2 className="mt-3 text-sm font-bold text-foreground">Choose a place to review</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        The queue holds real Google Places rows. Open one to classify it, check the
        composer-ready requirements, and either publish it or send it back.
      </p>
    </div>
  )
}

function CurationPage() {
  const context = useRouteContext({ from: '/_authenticated' })
  const canPublish = useMemo(() => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'catalog', ['publish'])
      return true
    } catch {
      return false
    }
  }, [context.user?.role])

  const [tab, setTab] = useState<Tab>('queue')
  const [queue, setQueue] = useState<QueueResponse | null>(null)
  const [queueLoading, setQueueLoading] = useState(true)
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null)
  const [coverageLoading, setCoverageLoading] = useState(true)

  const [status, setStatus] = useState<CurationStatus>('pending')
  const [county, setCounty] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 25

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<CandidateResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [fields, setFields] = useState<ReviewFields | null>(null)
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setOffset(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const response = await catalogAdminApi.queue({
        status,
        county: county === 'all' ? undefined : county,
        search,
        limit,
        offset,
      })
      setQueue(response)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load the review queue')
    } finally {
      setQueueLoading(false)
    }
  }, [county, limit, offset, search, status])

  const loadCoverage = useCallback(async () => {
    setCoverageLoading(true)
    try {
      setCoverage(await catalogAdminApi.coverage())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load coverage')
    } finally {
      setCoverageLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  useEffect(() => {
    void loadCoverage()
  }, [loadCoverage])

  const openCandidate = useCallback(async (placeId: string) => {
    setSelectedId(placeId)
    setDetailLoading(true)
    setServerErrors({})
    try {
      const response = await catalogAdminApi.candidate(placeId)
      setDetail(response)
      setFields(response.fields)
      setReadiness(evaluateComposerReadiness(response.fields))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load the candidate')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const refreshCandidate = useCallback(async (placeId: string) => {
    const response = await catalogAdminApi.candidate(placeId)
    setDetail(response)
    setFields(response.fields)
    setReadiness(evaluateComposerReadiness(response.fields))
  }, [])

  const onFieldChange = useCallback(
    (patch: Partial<ReviewFields>) => {
      setFields((current) => {
        if (!current) return current
        const next = { ...current, ...patch }
        setReadiness(evaluateComposerReadiness(next))
        return next
      })
      setServerErrors({})
    },
    [],
  )

  const submit = useCallback(
    async (mode: 'draft' | 'publish') => {
      if (!selectedId || !fields) return
      setSaving(true)
      setServerErrors({})
      try {
        const result =
          mode === 'publish'
            ? await catalogAdminApi.publish(selectedId, fields)
            : await catalogAdminApi.draft(selectedId, fields)
        toast.success(
          mode === 'publish'
            ? 'Place published as YTCI-reviewed.'
            : 'Draft saved. Keep enriching it when you are ready.',
        )
        setReadiness(result.readiness)
        await Promise.all([loadQueue(), loadCoverage(), refreshCandidate(selectedId)])
      } catch (error) {
        if (error instanceof CatalogApiError) {
          setServerErrors(error.fields ?? {})
          if (error.checks) {
            setReadiness((current) =>
              current ? { ...current, checks: error.checks!, ready: false } : current,
            )
          }
          toast.error(error.message)
        } else {
          toast.error('Could not save the review')
        }
      } finally {
        setSaving(false)
      }
    },
    [fields, loadCoverage, loadQueue, refreshCandidate, selectedId],
  )

  const reject = useCallback(
    async (reason: string) => {
      if (!selectedId) return
      setSaving(true)
      try {
        await catalogAdminApi.reject(selectedId, reason)
        toast.success('Place rejected and removed from the composer queue.')
        setSelectedId(null)
        setDetail(null)
        setFields(null)
        setReadiness(null)
        await Promise.all([loadQueue(), loadCoverage()])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not reject the place')
      } finally {
        setSaving(false)
      }
    },
    [loadCoverage, loadQueue, selectedId],
  )

  const total = queue?.total ?? 0
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)
  const queueCounts = coverage?.queueCounts

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-foreground">Catalog curation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Turn reviewed Google Places rows into composer-ready YTCI places. Nothing publishes
            until every required checklist item passes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tab === 'queue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('queue')}
          >
            <ClipboardText className="h-4 w-4" /> Review queue
          </Button>
          <Button
            variant={tab === 'coverage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('coverage')}
          >
            <MapTrifold className="h-4 w-4" /> Coverage report
          </Button>
        </div>
      </div>

      {tab === 'queue' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
          <div className="min-w-0 rounded-xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
              <div className="relative min-w-[180px] flex-1">
                <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search name or address"
                  className="h-9 pl-8"
                  aria-label="Search the review queue"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as CurationStatus)
                  setOffset(0)
                }}
              >
                <SelectTrigger className="h-9 w-36" aria-label="Filter by review status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURATION_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value[0].toUpperCase() + value.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={county}
                onValueChange={(value) => {
                  setCounty(value)
                  setOffset(0)
                }}
              >
                <SelectTrigger className="h-9 w-40" aria-label="Filter by county">
                  <SelectValue placeholder="All counties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All counties</SelectItem>
                  {(coverage?.coverage ?? [])
                    .filter((row) => row.totalCount > 0)
                    .map((row) => (
                      <SelectItem key={row.countyCode} value={row.countyCode}>
                        {row.county}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void loadQueue()}
                disabled={queueLoading}
                aria-label="Refresh queue"
              >
                <ArrowClockwise className={`h-4 w-4 ${queueLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {queueCounts ? (
              <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
                {CURATION_STATUSES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatus(value)
                      setOffset(0)
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      status === value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {value[0].toUpperCase() + value.slice(1)} {queueCounts[value] ?? 0}
                  </button>
                ))}
              </div>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Place</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(queue?.items ?? []).map((item) => (
                  <TableRow
                    key={item.placeId}
                    className={selectedId === item.placeId ? 'bg-muted/60' : ''}
                  >
                    <TableCell className="max-w-[280px] whitespace-normal">
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.address || item.placeId}
                      </div>
                    </TableCell>
                    <TableCell>{item.county}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.rating != null ? item.rating.toFixed(1) : '—'}
                      {item.reviewCount != null ? ` (${item.reviewCount})` : ''}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.curationStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void openCandidate(item.placeId)}
                        aria-label={`Review ${item.name}`}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(queue?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {queueLoading ? 'Loading queue…' : 'No places match this filter.'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                {from}–{to} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0 || queueLoading}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= total || queueLoading}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="min-h-0 xl:h-[calc(100vh-220px)]">
            {detailLoading ? (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
                Loading candidate…
              </div>
            ) : detail && fields && readiness ? (
              <ReviewPanel
                candidate={detail.candidate}
                fields={fields}
                readiness={readiness}
                errors={serverErrors}
                saving={saving}
                canPublish={canPublish}
                onChange={onFieldChange}
                onSaveDraft={() => void submit('draft')}
                onPublish={() => void submit('publish')}
                onReject={(reason) => void reject(reason)}
              />
            ) : (
              <EmptyReview />
            )}
          </div>
        </div>
      ) : (
        <CoverageReport data={coverage} loading={coverageLoading} onRefresh={() => void loadCoverage()} />
      )}
    </div>
  )
}
