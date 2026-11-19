/**
 * Review queue.
 *
 * Reviewer ≠ uploader, a second reviewer for accessibility claims, a staged
 * revision diff, next/previous and bulk publish. The sticky publish bar keeps the
 * disabled reason next to the button at every viewport.
 */
import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  CheckCircle,
  Eye,
  PaperPlaneTilt,
  Users,
  XCircle,
  Clock,
} from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { FormDialog } from '#/components/shell/FormDialog'
import { Button } from '#/components/ui/button'
import { useMice } from '#/lib/mice/store'
import {
  accessibilitySummary,
  eventDiff,
  formatLongDate,
  nextInQueue,
  previousInQueue,
  registrationModeLabel,
  reviewReadiness,
} from '#/lib/mice/workflow'
import {
  EmptyBlock,
  MicePill,
  Notice,
  QueueNav,
  SectionCard,
  StatusTone,
} from '#/components/mice/shared'

export const Route = createFileRoute('/_authenticated/programme/events/review')(
  {
    component: ReviewQueuePage,
  },
)

const SECOND_REVIEWERS = [
  'Dr. Wanjiku Mwangi',
  'Amina Hassan',
  'Brian Otieno',
  'Grace Wambui',
]
const ASSIGNEES = [
  'Amina Hassan',
  'Brian Otieno',
  'Grace Wambui',
  'Dr. Wanjiku Mwangi',
]

function ReviewQueuePage() {
  const {
    local,
    events,
    venues,
    organizers,
    registrations,
    eventQuery,
    selectedEventId,
    selectEvent,
    actorName,
    fixtureState,
    setFixtureState,
    isStale,
    assignReview,
    recordSecondReview,
    publishRevision,
    withdrawRevision,
  } = useMice()
  const [bulk, setBulk] = useState<Set<string>>(new Set())
  const [secondOpen, setSecondOpen] = useState(false)
  const [secondBy, setSecondBy] = useState('')
  const [secondNote, setSecondNote] = useState('')
  const [publishing, setPublishing] = useState(false)

  const queue = useMemo(
    () =>
      Object.values(local.revisions)
        .filter((revision) => revision.status === 'in_review')
        .sort((a, b) =>
          (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''),
        ),
    [local.revisions],
  )

  const currentId =
    selectedEventId && queue.some((item) => item.eventId === selectedEventId)
      ? selectedEventId
      : queue[0]?.eventId
  const revision = queue.find((item) => item.eventId === currentId)

  useEffect(() => {
    if (currentId && currentId !== selectedEventId) selectEvent(currentId)
  }, [currentId, selectEvent, selectedEventId])

  if (fixtureState === 'error') {
    return (
      <DataStateView
        state="error"
        title="The review queue could not load"
        description="The API returned an error. No partial queue is shown."
        onRetry={() => setFixtureState('default')}
      />
    )
  }

  if (fixtureState === 'empty') {
    return (
      <DataStateView
        state="empty"
        title="No review items in this fixture"
        description="Switch the data state to Default to load the sample queue."
      />
    )
  }

  if (queue.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Review queue" description="0 in review" />
        <EmptyBlock
          title="Nothing is waiting for review"
          body="Every submission has been published, returned, or withdrawn."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/programme/events/list">Back to events</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (!revision)
    return <DataStateView state="loading" title="Selecting a review item" />

  const venue =
    venues.find((item) => item.id === revision.write.venueId) ??
    eventQuery.data?.venueDetail ??
    null
  const organizer =
    organizers.find((item) => item.id === revision.write.organizerProfileId) ??
    eventQuery.data?.organizerDetail ??
    null
  const eventSummary = events.find((item) => item.id === revision.eventId)
  const confirmedFromEvent =
    eventSummary?.capacity != null && eventSummary.seatsRemaining != null
      ? Math.max(0, eventSummary.capacity - eventSummary.seatsRemaining)
      : 0
  const confirmed = Math.max(
    confirmedFromEvent,
    registrations.filter(
      (row) => row.status === 'confirmed' || row.status === 'checked_in',
    ).length,
  )
  const readiness = reviewReadiness({
    detail: eventQuery.data?.id === revision.eventId ? eventQuery.data : null,
    write: revision.write,
    accessEvidence: revision.accessibilityEvidence,
    revision,
    venue,
    organizer,
    confirmed,
    actorName,
    secondReviewBy: revision.secondReview?.by,
  })
  const diff =
    eventQuery.data?.id === revision.eventId
      ? eventDiff(eventQuery.data, revision.write)
      : []
  const claim = ['stepFreeEntrance', 'accessibleToilet', 'hearingLoop'].some(
    (key) =>
      (revision.write.accessibility as Record<string, unknown> | undefined)?.[
        key
      ] === 'yes',
  )
  const index = queue.findIndex((item) => item.eventId === revision.eventId)
  const bulkReady = [...bulk]
    .map((eventId) => queue.find((item) => item.eventId === eventId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => {
      const itemReadiness = reviewReadiness({
        detail: null,
        write: item.write,
        accessEvidence: item.accessibilityEvidence,
        revision: item,
        venue:
          venues.find((candidate) => candidate.id === item.write.venueId) ??
          null,
        organizer:
          organizers.find(
            (candidate) => candidate.id === item.write.organizerProfileId,
          ) ?? null,
        confirmed,
        actorName,
        secondReviewBy: item.secondReview?.by,
      })
      return itemReadiness.canPublish
    })

  async function publishCurrent() {
    if (!readiness.canPublish) return
    setPublishing(true)
    await publishRevision(revision!.eventId)
    setPublishing(false)
    setBulk((current) => {
      const next = new Set(current)
      next.delete(revision!.eventId)
      return next
    })
  }

  async function publishBulk() {
    setPublishing(true)
    for (const item of bulkReady) {
      await publishRevision(item.eventId)
    }
    setPublishing(false)
    setBulk(new Set())
  }

  const previous = previousInQueue(queue, revision, (item) => item.eventId)
  const next = nextInQueue(queue, revision, (item) => item.eventId)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Review queue"
        description={`${queue.length} in review · reviewer must differ from the uploader · oldest first`}
        actions={
          <QueueNav
            index={index}
            total={queue.length}
            label="review item"
            onPrevious={() => previous && selectEvent(previous.eventId)}
            onNext={() => next && selectEvent(next.eventId)}
          />
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.3fr)]">
        <SectionCard
          title="In review"
          description="Select a row to load its submitted record."
        >
          <ul className="divide-y divide-border">
            {queue.map((item) => {
              const itemEvent = events.find(
                (candidate) => candidate.id === item.eventId,
              )
              const itemReadiness = reviewReadiness({
                detail: null,
                write: item.write,
                accessEvidence: item.accessibilityEvidence,
                revision: item,
                venue:
                  venues.find(
                    (candidate) => candidate.id === item.write.venueId,
                  ) ?? null,
                organizer:
                  organizers.find(
                    (candidate) =>
                      candidate.id === item.write.organizerProfileId,
                  ) ?? null,
                confirmed,
                actorName,
                secondReviewBy: item.secondReview?.by,
              })
              const active = item.eventId === revision.eventId
              return (
                <li
                  key={item.eventId}
                  className={`py-3 first:pt-0 last:pb-0 ${active ? 'rounded-lg bg-muted/60 px-2' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 size-4"
                      aria-label={`Select ${item.write.title} for bulk approve`}
                      checked={bulk.has(item.eventId)}
                      onChange={(change) => {
                        setBulk((current) => {
                          const next = new Set(current)
                          if (change.target.checked) next.add(item.eventId)
                          else next.delete(item.eventId)
                          return next
                        })
                      }}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => selectEvent(item.eventId)}
                    >
                      <span className="block text-sm font-semibold text-foreground">
                        {item.write.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatLongDate(item.write.eventDate)} ·{' '}
                        {venueName(venues, item.write.venueId) ??
                          itemEvent?.venue?.name ??
                          'No venue'}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <MicePill tone="gold">In review</MicePill>
                        {item.changedAfterReview ? (
                          <MicePill tone="red">
                            Changed after submission
                          </MicePill>
                        ) : null}
                        {itemReadiness.blocked > 0 ? (
                          <MicePill tone="red">
                            {itemReadiness.blocked} blocking
                          </MicePill>
                        ) : (
                          <MicePill tone="green">Ready</MicePill>
                        )}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        Uploader {item.submittedBy ?? 'unknown'} · submitted{' '}
                        {item.submittedAt
                          ? formatLongDate(item.submittedAt.slice(0, 10))
                          : '—'}{' '}
                        · assigned{' '}
                        {local.reviewAssignments[item.eventId] ?? 'Unassigned'}
                      </span>
                    </button>
                    {active ? (
                      <Eye
                        className="mt-1 size-4 text-muted-foreground"
                        weight="bold"
                        aria-label="Selected"
                      />
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {bulk.size > 0 ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {bulkReady.length} of {bulk.size} selected item
              {bulk.size === 1 ? '' : 's'} ready to publish. Blocked items stay
              in the queue.
            </p>
          ) : null}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Readiness"
            description={`${revision.write.title} · uploader ${revision.submittedBy ?? 'unknown'} · you are ${actorName}`}
            action={
              <MicePill
                tone={StatusTone(
                  revision.changedAfterReview ? 'block' : 'in_review',
                )}
              >
                {revision.changedAfterReview
                  ? 'Changed after review'
                  : 'Submitted'}
              </MicePill>
            }
          >
            <ul className="space-y-2">
              {readiness.items.map((item) => {
                const Icon =
                  item.state === 'ok'
                    ? CheckCircle
                    : item.state === 'block'
                      ? XCircle
                      : Clock
                const tone =
                  item.state === 'ok'
                    ? 'text-[var(--success-leaf)]'
                    : item.state === 'block'
                      ? 'text-destructive'
                      : 'text-[var(--amber-deep)]'
                return (
                  <li key={item.key} className="flex items-start gap-2 text-xs">
                    <Icon
                      className={`mt-0.5 size-4 shrink-0 ${tone}`}
                      weight="bold"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={
                          item.state === 'block'
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground'
                        }
                      >
                        {item.label}
                      </span>
                      {item.state === 'block' && item.field ? (
                        <>
                          <br />
                          <Link
                            to="/programme/events/$eventId"
                            params={{ eventId: revision.eventId }}
                            hash={`event-${item.field}`}
                            className="text-[11px] font-semibold text-primary underline underline-offset-2"
                          >
                            Resolve on the event record
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <label
                htmlFor="review-assignee"
                className="text-[11px] font-bold text-muted-foreground"
              >
                Assigned to
              </label>
              <select
                id="review-assignee"
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                value={local.reviewAssignments[revision.eventId] ?? ''}
                onChange={(change) =>
                  assignReview(revision.eventId, change.target.value)
                }
              >
                <option value="">Unassigned</option>
                {ASSIGNEES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {revision.changedAfterReview ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => withdrawRevision(revision.eventId)}
                  disabled={isStale}
                >
                  Return to the uploader
                </Button>
              ) : null}
            </div>
          </SectionCard>

          {diff.length > 0 ? (
            <SectionCard
              title="Changes in this revision"
              description="Live values are unchanged until a reviewer publishes."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <caption className="sr-only">
                    Field-by-field live and staged values
                  </caption>
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="py-1">
                        Field
                      </th>
                      <th scope="col" className="py-1">
                        Live
                      </th>
                      <th scope="col" className="py-1">
                        Staged
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((row) => (
                      <tr key={row.field} className="border-t border-border">
                        <td className="py-1.5 font-semibold text-foreground">
                          {row.label}
                        </td>
                        <td className="py-1.5 text-muted-foreground">
                          {row.live}
                        </td>
                        <td className="py-1.5 font-medium text-foreground">
                          {row.staged}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Submitted record"
            description="Exactly what the uploader submitted."
          >
            <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
              <Record
                label="Dates"
                value={`${formatLongDate(revision.write.eventDate)}${revision.write.endDate ? ` – ${formatLongDate(revision.write.endDate)}` : ''}`}
              />
              <Record label="Venue" value={venue?.name ?? 'Not linked'} />
              <Record
                label="Capacity"
                value={`${revision.write.capacity ?? '—'} · ${confirmed} registered`}
              />
              <Record
                label="Registration"
                value={`${registrationModeLabel(revision.write.registrationMode ?? 'none')}${revision.write.priceAmount != null ? ` · ${revision.write.priceCurrency ?? 'KES'} ${revision.write.priceAmount}` : ''}`}
              />
              <Record
                label="Accessibility"
                value={accessibilitySummary(revision.write.accessibility)}
              />
              <Record
                label="Access evidence"
                value={revision.accessibilityEvidence || 'Not recorded'}
              />
              {revision.note ? (
                <Record label="Uploader note" value={revision.note} />
              ) : null}
            </dl>
            {revision.write.ticketUrl ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Ticket URL:{' '}
                <a
                  className="underline"
                  href={revision.write.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {revision.write.ticketUrl}
                </a>
              </p>
            ) : null}
          </SectionCard>

          {claim ? (
            <SectionCard
              title="Second reviewer"
              description="Required when an accessibility claim is part of the event."
            >
              <div className="flex flex-wrap items-center gap-2">
                {revision.secondReview ? (
                  <MicePill tone="green">
                    Approved by {revision.secondReview.by}
                  </MicePill>
                ) : (
                  <MicePill tone="gold">Not yet approved</MicePill>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSecondOpen(true)}
                  disabled={Boolean(revision.secondReview) || isStale}
                >
                  <Users className="size-3.5" weight="bold" />{' '}
                  {revision.secondReview ? 'Recorded' : 'Record second review'}
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                The second reviewer must differ from the current reviewer.{' '}
                {revision.secondReview?.note ?? ''}
              </p>
            </SectionCard>
          ) : null}

          {revision.changedAfterReview ? (
            <Notice tone="danger" title="Changed after submission">
              Publishing stays blocked. Return the revision to the uploader and
              have them submit again.
            </Notice>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {readiness.canPublish
              ? 'All checks pass. Publishing applies the revision and notifies the uploader.'
              : readiness.reason}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isStale ? 'Stale snapshot · writes disabled. ' : ''}
            {readiness.blocked} blocking · {readiness.waiting} waiting · actor{' '}
            {actorName} · uploader {revision.submittedBy ?? 'unknown'}
          </p>
        </div>
        {bulk.size > 0 ? (
          <Button
            variant="outline"
            onClick={() => void publishBulk()}
            disabled={bulkReady.length === 0 || publishing || isStale}
          >
            Publish {bulkReady.length} ready
          </Button>
        ) : null}
        <Button
          onClick={() => void publishCurrent()}
          disabled={!readiness.canPublish || publishing || isStale}
        >
          <PaperPlaneTilt className="size-4" weight="bold" />{' '}
          {publishing ? 'Publishing…' : 'Approve and publish'}
        </Button>
      </div>

      <FormDialog
        open={secondOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSecondOpen(false)
            setSecondBy('')
            setSecondNote('')
          }
        }}
        title="Record a second accessibility review"
        description="Name the reviewer who checked the claim. It must differ from the current reviewer."
        submitLabel="Record second review"
        fieldErrors={
          secondBy && secondBy !== actorName
            ? undefined
            : { reviewer: 'Choose a reviewer other than yourself.' }
        }
        onSubmit={() => {
          if (!secondBy || secondBy === actorName) return
          recordSecondReview(revision.eventId, secondBy, secondNote)
          setSecondOpen(false)
          setSecondBy('')
          setSecondNote('')
        }}
      >
        <label
          htmlFor="second-reviewer"
          className="text-xs font-bold text-foreground"
        >
          Second reviewer
        </label>
        <select
          id="second-reviewer"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={secondBy}
          onChange={(change) => setSecondBy(change.target.value)}
        >
          <option value="">Choose a reviewer</option>
          {SECOND_REVIEWERS.filter((name) => name !== actorName).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label
          htmlFor="second-note"
          className="text-xs font-bold text-foreground"
        >
          What was checked
        </label>
        <textarea
          id="second-note"
          className="min-h-20 w-full rounded-md border border-input bg-transparent p-2 text-sm"
          value={secondNote}
          onChange={(change) => setSecondNote(change.target.value)}
          placeholder="e.g. step-free route inspected on site"
        />
      </FormDialog>
    </div>
  )
}

function Record({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}

function venueName(
  venues: Array<{ id?: string; name: string }>,
  venueId: string | null | undefined,
): string | null {
  return venues.find((venue) => venue.id === venueId)?.name ?? null
}
