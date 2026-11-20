import { createFileRoute, redirect, Link, useRouteContext } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowClockwise, ArrowSquareOut, UserPlus, ShieldWarning, CheckCircle,
} from '@phosphor-icons/react'
import { requirePermission } from '#/lib/authz'
import { canModerateAudioStories } from '#/lib/audio-story-permissions'
import { useApi } from '#/lib/api/use-api'
import { ApiErrorResponse } from '#/lib/api/types'
import type {
  AudioReviewQueueItem, AudioReviewQueueResponse, AssignReviewerInput, ReviewQueueFilter,
} from '#/lib/api/audio-stories'
import { AudioStoryTabs } from '#/components/audio-stories/AudioStoryTabs'
import { AssignReviewerDialog } from '#/components/audio-stories/AssignReviewerDialog'
import {
  LanguageChips, RiskBadge, formatDate, formatRelative,
} from '#/components/audio-stories/badges'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '#/components/ui/table'

export const Route = createFileRoute('/_authenticated/audio-stories_/review')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'audioStories', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: AudioReviewQueuePage,
})

const FILTERS: Array<{ key: ReviewQueueFilter; label: string; description: string }> = [
  { key: 'all', label: 'All reviews', description: 'Every revision currently in the review queue.' },
  { key: 'unassigned', label: 'Unassigned', description: 'Revisions waiting for a reviewer.' },
  { key: 'mine', label: 'Mine', description: 'Revisions assigned to you as primary or second reviewer.' },
  { key: 'sensitive', label: 'Sensitive', description: 'Needs two distinct approvals before publishing.' },
  { key: 'restricted', label: 'Restricted', description: 'Cannot be approved in this workflow; rights/legal action required.' },
]

const EMPTY_QUEUE: AudioReviewQueueResponse = {
  items: [],
  counts: { unassigned: 0, mine: 0, sensitive: 0, restricted: 0 },
}

function AudioReviewQueuePage() {
  const api = useApi()
  const context = useRouteContext({ from: '/_authenticated' })
  const role = context.user?.role
  const canModerate = canModerateAudioStories(role)

  const [filter, setFilter] = useState<ReviewQueueFilter>('all')
  const [queue, setQueue] = useState<AudioReviewQueueResponse>(EMPTY_QUEUE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState<AudioReviewQueueItem | null>(null)
  const [assignSaving, setAssignSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setQueue(await api.audioStories.reviewQueue(filter))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the review queue')
      setQueue(EMPTY_QUEUE)
    } finally {
      setLoading(false)
    }
  }, [api, filter])

  useEffect(() => { void load() }, [load])

  const counts = queue.counts
  const activeFilter = FILTERS.find((item) => item.key === filter) ?? FILTERS[0]

  const handleAssign = async (input: AssignReviewerInput): Promise<boolean> => {
    if (!assignTarget) return false
    setAssignSaving(true)
    try {
      await api.audioStories.assignReviewer(assignTarget.storyId, assignTarget.revisionId, input)
      toast.success(input.reason ? 'Reviewer reassigned' : 'Reviewer assigned')
      await load()
      return true
    } catch (err) {
      showReviewError(err, 'Failed to assign the reviewer')
      return false
    } finally {
      setAssignSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">Audio Story Reviews</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Assign reviewers, record decisions and keep separation of duties intact before publishing.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} className="rounded-full">
          <ArrowClockwise className="h-4 w-4" />
          Refresh queue
        </Button>
      </div>

      <AudioStoryTabs reviewCount={counts.unassigned} />

      {!canModerate && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3" role="status">
          <ShieldWarning className="h-5 w-5 text-muted-foreground" weight="fill" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Read-only.</strong> Your role can view the review queue. Only administrators and super admins can assign reviewers or record decisions.
          </p>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QueueCount label="Unassigned" value={counts.unassigned} tone={counts.unassigned > 0 ? 'amber' : 'default'} />
        <QueueCount label="Assigned to me" value={counts.mine} />
        <QueueCount label="Sensitive" value={counts.sensitive} tone={counts.sensitive > 0 ? 'amber' : 'default'} />
        <QueueCount label="Restricted" value={counts.restricted} tone={counts.restricted > 0 ? 'error' : 'default'} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-[var(--surface-2)] p-1" role="tablist" aria-label="Review queue filters">
        {FILTERS.map((item) => {
          const count = item.key === 'all'
            ? (filter === 'all' ? queue.items.length : undefined)
            : counts[item.key]
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                filter === item.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
              {typeof count === 'number' && (
                <span className="rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">{activeFilter.description}</p>

      {loading ? (
        <QueueSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-[var(--error-container)] p-8 text-center" role="alert">
          <p className="font-semibold text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>Retry</Button>
        </div>
      ) : queue.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-[var(--leaf)]" weight="duotone" />
          <h2 className="mt-3 font-sans text-lg font-bold text-foreground">Nothing in this queue</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {filter === 'all'
              ? 'No revisions are currently waiting for review.'
              : 'No revisions match this filter right now.'}
          </p>
          {filter !== 'all' && (
            <Button variant="outline" className="mt-5" onClick={() => setFilter('all')}>
              Show all reviews
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--surface-2)]">
                <TableHead scope="col" className="text-[11px] font-bold uppercase tracking-widest">Story</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest lg:table-cell">Collection</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest md:table-cell">Risk</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest xl:table-cell">Languages</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest sm:table-cell">Submitted</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest lg:table-cell">Reviewer</TableHead>
                <TableHead scope="col" className="w-[190px]"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.items.map((item) => (
                <TableRow key={`${item.storyId}-${item.revisionId}`} className="hover:bg-transparent">
                  <TableCell>
                    <div className="min-w-[190px]">
                      <Link
                        to="/audio-stories/$storyId"
                        params={{ storyId: item.storyId }}
                        search={{ tab: canModerate ? 'review' : undefined }}
                        className="font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.storyTitle}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Revision {item.revisionId.slice(0, 8)}…</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                        <RiskBadge risk={item.riskTier} />
                        <span className="text-[11px] text-muted-foreground">{formatRelative(item.submittedAt)}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {item.collectionTitle || 'Unplaced'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><RiskBadge risk={item.riskTier} /></TableCell>
                  <TableCell className="hidden xl:table-cell"><LanguageChips languages={item.languages} /></TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    <span className="block">{formatDate(item.submittedAt)}</span>
                    <span className="text-[11px]">{formatRelative(item.submittedAt)}</span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {item.assignedReviewerName ? (
                      <span className="block">
                        {item.assignedReviewerName}
                        {item.secondReviewerId && <span className="block text-[11px]">Second reviewer assigned</span>}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--amber-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--amber-deep)]">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {canModerate && (
                        <Button size="sm" variant="outline" onClick={() => setAssignTarget(item)}>
                          <UserPlus className="h-4 w-4" />
                          {item.assignedReviewerId ? 'Reassign' : 'Assign'}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link
                          to="/audio-stories/$storyId"
                          params={{ storyId: item.storyId }}
                          search={{ tab: canModerate ? 'review' : undefined }}
                          aria-label={`Open ${item.storyTitle}`}
                        >
                          <ArrowSquareOut className="h-4 w-4" />
                          Open
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>{queue.items.length} {queue.items.length === 1 ? 'revision' : 'revisions'} in this view</span>
            <span>Sensitive revisions need two distinct approvals.</span>
          </div>
        </div>
      )}

      <AssignReviewerDialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => { if (!open) setAssignTarget(null) }}
        storyTitle={assignTarget?.storyTitle}
        currentReviewerId={assignTarget?.assignedReviewerId}
        currentSecondReviewerId={assignTarget?.secondReviewerId}
        reassigning={Boolean(assignTarget?.assignedReviewerId)}
        saving={assignSaving}
        onAssign={handleAssign}
      />
    </div>
  )
}

function QueueCount({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'amber' | 'error' }) {
  const toneClass = tone === 'error'
    ? 'border-destructive/40 text-destructive'
    : tone === 'amber'
      ? 'border-[var(--amber-deep)] text-[var(--amber-deep)]'
      : 'border-border text-foreground'
  return (
    <div className={`rounded-lg border bg-card px-4 py-3 ${toneClass}`} style={{ boxShadow: 'var(--card-shadow)' }}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-sans text-2xl font-bold">{value}</p>
    </div>
  )
}

function QueueSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b bg-[var(--surface-2)] px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-6 border-b px-4 py-4 last:border-0">
          <div className="flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

function showReviewError(error: unknown, fallback: string) {
  if (error instanceof ApiErrorResponse) {
    if (error.code === 'SEPARATION_OF_DUTIES') {
      toast.error('Separation of duties: a reviewer cannot review their own upload or attestation.')
      return
    }
    if (error.code === 'RESTRICTED_REVIEW') {
      toast.error('Restricted material cannot be approved in this workflow.')
      return
    }
    if (error.code === 'REVIEW_CONFLICT') {
      toast.error('You have already recorded a decision on this revision.')
      return
    }
    if (error.code === 'NOT_FOUND') {
      toast.error('This story or revision no longer exists.')
      return
    }
  }
  toast.error(error instanceof Error ? error.message : fallback)
}
