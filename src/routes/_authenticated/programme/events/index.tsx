/**
 * MICE operations overview.
 *
 * One dataset marker per screen; the KPI values carry production context in the
 * foot line, never inside the number.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { useMice } from '#/lib/mice/store'
import {
  formatDateRange,
  formatDateTime,
  reportAgeHours,
} from '#/lib/mice/workflow'
import {
  EmptyBlock,
  MetricBar,
  MicePill,
  SectionCard,
  SimpleTable,
  StatCard,
  StatusTone,
  statusLabel,
} from '#/components/mice/shared'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/programme/events/')({
  component: EventsOverviewPage,
})

function EventsOverviewPage() {
  const {
    events,
    local,
    reports,
    organizers,
    registrations,
    checkIns,
    selectedEventId,
    eventsQuery,
    reportsQuery,
    organizersQuery,
  } = useMice()

  const published = events.filter(
    (event) =>
      (local.lifecycle[event.id]?.state ?? event.status) === 'published',
  ).length
  const reviewItems = Object.values(local.revisions).filter(
    (revision) => revision.status === 'in_review',
  )
  const openReports = reports.filter(
    (report) => report.status === 'open' || report.status === 'triaged',
  )
  const pendingOrganizers = organizers.filter(
    (organizer) =>
      organizer.verificationStatus === 'pending' ||
      organizer.verificationStatus === 'expired' ||
      (organizer.verificationExpiresAt
        ? new Date(organizer.verificationExpiresAt) < new Date()
        : false),
  )
  const oldestReview = reviewItems.reduce((oldest, item) => {
    if (!item.submittedAt) return oldest
    const age = Math.floor(
      (Date.now() - new Date(item.submittedAt).getTime()) / 86_400_000,
    )
    return Math.max(oldest, age)
  }, 0)
  const selectedEvent = events.find((event) => event.id === selectedEventId)
  const confirmed = registrations.filter(
    (r) => r.status === 'confirmed' || r.status === 'checked_in',
  ).length
  const checkedIn = new Set(
    [
      ...checkIns.map((row) => row.registrationId),
      ...local.localCheckIns
        .filter((row) => row.eventId === selectedEventId && !row.removed)
        .map((row) => row.registrationId),
    ].filter(Boolean),
  ).size
  const offer = selectedEventId ? local.offers[selectedEventId] : undefined
  const oldestReport = [...openReports].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )[0]

  const attention: Array<{
    title: string
    detail: string
    owner: string
    to: string
    action: string
  }> = []
  if (offer) {
    attention.push({
      title: 'Waitlist offer expires soon',
      detail: `${offer.attendeeName} · confirm-by ${formatDateTime(offer.expiresAt)}`,
      owner: 'Front desk',
      to: '/programme/events/registrations',
      action: 'Open waitlist',
    })
  }
  if (reviewItems.length > 0) {
    attention.push({
      title: `${reviewItems[0].write.title} is in review`,
      detail: `Oldest ${oldestReview} day${oldestReview === 1 ? '' : 's'} · uploader ${reviewItems[0].submittedBy ?? 'unknown'}`,
      owner: 'Review queue',
      to: '/programme/events/review',
      action: 'Open review',
    })
  }
  if (oldestReport) {
    attention.push({
      title: `Report ${oldestReport.id.slice(0, 8)} · ${oldestReport.reason.replace(/_/g, ' ')}`,
      detail: `${reportAgeHours(oldestReport.createdAt)}h of the 48h target · ${oldestReport.details ?? 'no detail'}`,
      owner: 'Trust & safety',
      to: '/programme/events/reports',
      action: 'Resolve',
    })
  }
  if (pendingOrganizers.length > 0) {
    attention.push({
      title: `${pendingOrganizers[0].displayName} verification`,
      detail: `${pendingOrganizers[0].verificationStatus ?? 'unverified'} · renewal ${pendingOrganizers[0].verificationExpiresAt ? formatDateTime(pendingOrganizers[0].verificationExpiresAt) : 'not set'}`,
      owner: 'Trust & safety',
      to: '/programme/events/organisers',
      action: 'Review',
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Events overview"
        description={`Operate surface · sample workspace · last successful sync ${formatDateTime(new Date().toISOString())}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/programme/events/list">All events</Link>
          </Button>
        }
      />

      <div
        data-testid="mice-kpi-strip"
        className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]"
      >
        <StatCard
          label="Published"
          value={published}
          foot={`${events.length} in this workspace · 18 in production`}
        />
        <StatCard
          label="In review"
          value={reviewItems.length}
          foot={
            reviewItems.length
              ? `Oldest ${oldestReview} day${oldestReview === 1 ? '' : 's'}`
              : 'Queue clear'
          }
          tone={reviewItems.length ? 'warn' : 'neutral'}
        />
        <StatCard
          label="Registrations"
          value={confirmed}
          foot={`${confirmed} of ${selectedEvent?.capacity ?? 0} for the selected event`}
        />
        <StatCard
          label="Open reports"
          value={openReports.length}
          foot={
            oldestReport
              ? `Nearest due: ${reportAgeHours(oldestReport.createdAt)}h old`
              : 'None open'
          }
          tone={openReports.length ? 'danger' : 'neutral'}
        />
      </div>

      <div
        data-testid="mice-overview-grid"
        className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,26rem),1fr))]"
      >
        <SectionCard title="Needs attention" description="Sorted by due time">
          {attention.length === 0 ? (
            <EmptyBlock
              title="Nothing needs a decision"
              body="Every queue is clear for the current data."
            />
          ) : (
            <ul className="divide-y divide-border">
              {attention.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {item.owner}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={item.to}>
                      {item.action}{' '}
                      <ArrowRight className="size-3.5" weight="bold" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Check-in today"
            description={
              selectedEvent
                ? `${selectedEvent.title} · ${formatDateRange(selectedEvent.startsAt, selectedEvent.endsAt)}`
                : 'No event selected'
            }
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/programme/events/check-in">Open counter</Link>
              </Button>
            }
          >
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {checkedIn}
            </p>
            <p className="text-xs text-muted-foreground">
              of {confirmed} confirmed · {Math.max(0, confirmed - checkedIn)}{' '}
              not yet arrived
            </p>
            <div className="mt-2">
              <MetricBar value={checkedIn} max={Math.max(confirmed, 1)} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Counter, override and undo live here. Staff QR scanning is a
              separate mobile surface.
            </p>
          </SectionCard>

          <SectionCard
            title="Recent"
            description="Since the last successful sync"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/programme/events/audit">Open log</Link>
              </Button>
            }
          >
            <ul className="space-y-2">
              {local.audit.slice(0, 4).map((entry) => (
                <li
                  key={entry.id}
                  className="grid grid-cols-[4rem_1fr] gap-2 text-xs"
                >
                  <span className="text-muted-foreground">
                    {new Date(entry.at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">
                      {entry.action}
                    </span>
                    <span className="block text-muted-foreground">
                      {entry.entity}
                    </span>
                  </span>
                </li>
              ))}
              {local.audit.length === 0 ? (
                <li className="text-xs text-muted-foreground">
                  No activity yet.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Upcoming events"
        description="One dataset marker: this workspace ships the sample fixture set; production holds 18 events."
      >
        <SimpleTable
          caption="Upcoming events with status, registrations and organizer"
          rows={events}
          isLoading={eventsQuery.isPending}
          isError={eventsQuery.isError}
          onRetry={() => void eventsQuery.refetch()}
          emptyTitle="No events in this workspace"
          emptyDescription="The fixture set is empty for this data state."
          columns={[
            {
              header: 'Event',
              cell: (event) => (
                <span>
                  <Link
                    to="/programme/events/$eventId"
                    params={{ eventId: event.id }}
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {event.title}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateRange(event.startsAt, event.endsAt)} ·{' '}
                    {event.venue?.name ?? 'No venue'}
                  </span>
                </span>
              ),
            },
            { header: 'Class', cell: (event) => statusLabel(event.eventClass) },
            {
              header: 'Status',
              cell: (event) => {
                const revision = local.revisions[event.id]
                const state = local.lifecycle[event.id]?.state ?? event.status
                return (
                  <span className="flex flex-col gap-1">
                    <MicePill tone={StatusTone(state)}>
                      {statusLabel(state)}
                    </MicePill>
                    {revision ? (
                      <span className="text-[10px] text-muted-foreground">
                        {statusLabel(revision.status)}
                      </span>
                    ) : null}
                  </span>
                )
              },
            },
            {
              header: 'Registered',
              cell: (event) =>
                `${event.capacity != null && event.seatsRemaining != null ? event.capacity - event.seatsRemaining : 0} / ${event.capacity ?? '—'}`,
            },
            {
              header: 'Organizer',
              cell: (event) => (
                <span>
                  {event.organizer?.displayName ?? '—'}
                  <span className="block text-xs text-muted-foreground">
                    {event.organizer?.label}
                  </span>
                </span>
              ),
            },
            {
              header: 'Actions',
              cell: (event) => (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/programme/events/$eventId"
                    params={{ eventId: event.id }}
                  >
                    Edit
                  </Link>
                </Button>
              ),
            },
          ]}
        />
      </SectionCard>

      {reportsQuery.isError || organizersQuery.isError ? (
        <MicePill tone="red">
          One or more side panels failed to load; retry from its screen.
        </MicePill>
      ) : null}
    </div>
  )
}
