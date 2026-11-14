import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const [savingAction, setSavingAction] = useState<'draft' | 'publish' | 'reject' | null>(null)
  const [dirty, setDirty] = useState(false)
  const requestRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)

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

  const confirmDiscard = useCallback(() => {
    if (!dirty) return true
    return window.confirm('Discard unsaved changes to this place?')
  }, [dirty])

  const openCandidate = useCallback(async (placeId: string) => {
    if (selectedId === placeId) return
    if (!confirmDiscard()) return
    const requestId = ++requestRef.current
    setSelectedId(placeId)
    setDetail(null)
    setFields(null)
    setReadiness(null)
    setDetailLoading(true)
    setServerErrors({})
    setDirty(false)
    try {
      const response = await catalogAdminApi.candidate(placeId)
      if (requestRef.current !== requestId) return
      setDetail(response)
      setFields(response.fields)
      setReadiness(evaluateComposerReadiness(response.fields))
    } catch (error) {
      if (requestRef.current !== requestId) return
      toast.error(error instanceof Error ? error.message : 'Failed to load the candidate')
    } finally {
      if (requestRef.current === requestId) setDetailLoading(false)
    }
  }, [confirmDiscard, selectedId])

  const refreshCandidate = useCallback(async (placeId: string) => {
    const requestId = ++requestRef.current
    const response = await catalogAdminApi.candidate(placeId)
    if (requestRef.current !== requestId) return
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
      setDirty(true)
    },
    [],
  )

  const advanceToNext = useCallback(
    async (currentPlaceId: string) => {
      const filtered = {
        status,
        county: county === 'all' ? undefined : county,
        search,
        limit,
        offset,
      }
      const currentIndex = queue?.items.findIndex((item) => item.placeId === currentPlaceId) ?? 0
      const clearPanel = () => {
        requestRef.current += 1
        setSelectedId(null)
        setDetail(null)
        setFields(null)
        setReadiness(null)
        setServerErrors({})
        setDirty(false)
      }
      try {
        const page = await catalogAdminApi.queue(filtered)
        const currentStillVisible = page.items.some((item) => item.placeId === currentPlaceId)
        const targetIndex = currentStillVisible
          ? currentIndex + 1
          : Math.min(currentIndex, Math.max(0, page.items.length - 1))
        let target: QueueResponse['items'][number] | undefined = page.items[targetIndex]
        if (!target && currentStillVisible && offset + limit < page.total) {
          const nextPage = await catalogAdminApi.queue({ ...filtered, offset: offset + limit })
          target = nextPage.items[0]
          if (target) setOffset(offset + limit)
        }
        if (!target && offset > 0) {
          const previousOffset = Math.max(0, offset - limit)
          const previous = await catalogAdminApi.queue({ ...filtered, offset: previousOffset })
          target = previous.items.find((item) => item.placeId !== currentPlaceId)
          if (target) setOffset(previousOffset)
        }
        if (target) {
          await openCandidate(target.placeId)
        } else {
          clearPanel()
        }
      } catch {
        // Leaving the current panel is safer than failing the save.
        clearPanel()
      }
    },
    [county, limit, offset, openCandidate, queue?.items, search, status],
  )

  const submit = useCallback(
    async (mode: 'draft' | 'publish', options: { advance?: boolean } = {}) => {
      if (!selectedId || !fields) return
      if (detail?.candidate.placeId !== selectedId) {
        toast.error('The selected place changed. Re-open it before saving.')
        return
      }
      setSavingAction(mode)
      setServerErrors({})
      try {
        const result =
          mode === 'publish'
            ? await catalogAdminApi.publish(selectedId, fields)
            : await catalogAdminApi.draft(selectedId, fields)
        setReadiness(result.readiness)
        setDirty(false)
        await Promise.all([loadQueue(), loadCoverage()])
        await refreshCandidate(selectedId).catch(() => {})
        toast.success(
          mode === 'publish'
            ? 'Place published as YTCI-reviewed.'
            : 'Draft saved. Keep enriching it when you are ready.',
        )
        if (mode === 'publish' || options.advance) {
          await advanceToNext(selectedId)
        }
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
        setSavingAction(null)
      }
    },
    [advanceToNext, detail?.candidate.placeId, fields, loadCoverage, loadQueue, refreshCandidate, selectedId],
  )

  const reject = useCallback(
    async (reason: string) => {
      if (!selectedId) return
      setSavingAction('reject')
      try {
        await catalogAdminApi.reject(selectedId, reason)
        setDirty(false)
        await Promise.all([loadQueue(), loadCoverage()])
        toast.success('Place rejected and removed from the composer queue.')
        await advanceToNext(selectedId)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not reject the place')
      } finally {
        setSavingAction(null)
      }
    },
    [advanceToNext, loadCoverage, loadQueue, selectedId],
  )

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    if (!detail) return
    requestAnimationFrame(() => {
      panelRef.current?.focus()
      panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }, [detail?.candidate.placeId])

  const changeTab = useCallback(
    (next: Tab) => {
      if (next === tab) return
      if (!confirmDiscard()) return
      if (dirty) {
        requestRef.current += 1
        setSelectedId(null)
        setDetail(null)
        setFields(null)
        setReadiness(null)
        setServerErrors({})
        setDirty(false)
      }
      setTab(next)
    },
    [confirmDiscard, dirty, tab],
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
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Catalog curation views">
          <Button
            variant={tab === 'queue' ? 'default' : 'outline'}
            size="sm"
            role="tab"
            aria-selected={tab === 'queue'}
            onClick={() => changeTab('queue')}
          >
            <ClipboardText className="h-4 w-4" /> Review queue
          </Button>
          <Button
            variant={tab === 'coverage' ? 'default' : 'outline'}
            size="sm"
            role="tab"
            aria-selected={tab === 'coverage'}
            onClick={() => changeTab('coverage')}
          >
            <MapTrifold className="h-4 w-4" /> Coverage report
          </Button>
        </div>
      </div>

      {tab === 'queue' ? (
        <div
          className={`grid gap-5 ${
            selectedId ? 'xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]' : 'grid-cols-1'
          }`}
        >
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
                  <TableHead className="text-right">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(queue?.items ?? []).map((item) => (
                  <TableRow
                    key={item.placeId}
                    className={selectedId === item.placeId ? 'bg-primary/10' : ''}
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
                      <StatusBadge
                        status={item.curationStatus}
                        label={
                          item.curationStatus[0].toUpperCase() + item.curationStatus.slice(1)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void openCandidate(item.placeId)}
                        disabled={savingAction !== null}
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

          {selectedId ? (
            <div
              ref={panelRef}
              tabIndex={-1}
              className="min-h-0 focus:outline-none xl:h-[calc(100vh-220px)]"
              aria-label="Place review panel"
            >
              {detailLoading ? (
                <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
                  Loading candidate…
                </div>
              ) : detail && fields && readiness && detail.candidate.placeId === selectedId ? (
                <ReviewPanel
                  candidate={detail.candidate}
                  fields={fields}
                  readiness={readiness}
                  errors={serverErrors}
                  savingAction={savingAction}
                  dirty={dirty}
                  canPublish={canPublish}
                  onChange={onFieldChange}
                  onSaveDraft={() => void submit('draft')}
                  onSaveAndNext={() => void submit('draft', { advance: true })}
                  onPublish={() => void submit('publish')}
                  onReject={(reason) => void reject(reason)}
                />
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
                  Select the place again to review it.
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <CoverageReport
          data={coverage}
          loading={coverageLoading}
          onRefresh={() => void loadCoverage()}
          onOpenCounty={(countyCode) => {
            if (!confirmDiscard()) return
            requestRef.current += 1
            setTab('queue')
            setCounty(countyCode)
            setStatus('pending')
            setSearch('')
            setSearchInput('')
            setOffset(0)
            setSelectedId(null)
            setDetail(null)
            setFields(null)
            setReadiness(null)
            setDirty(false)
          }}
        />
      )}
    </div>
  )
}
