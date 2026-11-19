/**
 * Registrations and the ordered waitlist.
 *
 * The capacity counter is server-enforced; the table derives its state from the
 * API rows plus the local corrections the 1.0.0 contract cannot yet write.
 */
import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  DownloadSimple,
  PencilSimple,
  Ticket,
  UserMinus,
} from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { FilterBar } from '#/components/shell/FilterBar'
import { FormDialog } from '#/components/shell/FormDialog'
import { DataStateView } from '#/components/shell/DataState'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { useMice } from '#/lib/mice/store'
import {
  attendeeEmail,
  attendeeName,
  formatDateRange,
  formatDateTime,
  orderWaitlist,
} from '#/lib/mice/workflow'
import {
  EventScope,
  LocalActionNote,
  MetricBar,
  MicePill,
  Notice,
  SectionCard,
  SimpleTable,
  StatusTone,
  statusLabel,
} from '#/components/mice/shared'
import type { AdminRegistration } from '#/lib/mice/types'

export const Route = createFileRoute(
  '/_authenticated/programme/events/registrations',
)({
  component: RegistrationsPage,
})

function RegistrationsPage() {
  const {
    eventQuery,
    fixtureState,
    setFixtureState,
    selectedEventId,
    isStale,
    registrations,
    registrationsQuery,
    local,
    sendOffer,
    withdrawOffer,
    acceptOffer,
    overrideRegistration,
    cancelRegistration,
  } = useMice()
  const [search, setSearch] = useState('')
  const [state, setState] = useState('all')
  const [editing, setEditing] = useState<AdminRegistration | null>(null)
  const [cancelling, setCancelling] = useState<AdminRegistration | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const effective = useMemo(
    () =>
      registrations.map((registration) => {
        const override = local.registrationOverrides[registration.id]
        if (!override) return registration
        return {
          ...registration,
          status: override.status ?? registration.status,
          attendee: {
            displayName:
              override.attendeeName ?? registration.attendee?.displayName,
            email: override.attendeeEmail ?? registration.attendee?.email,
          },
          answersSummary:
            override.answersSummary ?? registration.answersSummary,
        }
      }),
    [local.registrationOverrides, registrations],
  )

  const confirmed = effective.filter(
    (row) => row.status === 'confirmed' || row.status === 'checked_in',
  )
  const waitlist = orderWaitlist(
    effective.filter((row) => row.status === 'waitlisted'),
  )
  const offer = selectedEventId ? local.offers[selectedEventId] : undefined

  const visible = effective.filter((registration) => {
    if (state === 'checked') return registration.status === 'checked_in'
    if (state === 'not-checked') return registration.status === 'confirmed'
    if (state === 'waitlist') return registration.status === 'waitlisted'
    if (state === 'cancelled') return registration.status === 'cancelled'
    return true
  })
  const query = search.trim().toLowerCase()
  const filtered = visible.filter(
    (registration) =>
      !query ||
      `${attendeeName(registration)} ${attendeeEmail(registration)} ${registration.ticket?.qrPayload ?? ''}`
        .toLowerCase()
        .includes(query),
  )

  function exportNeeds() {
    const rows = [
      ['Attendee', 'Email', 'Status', 'Access needs', 'Ticket'],
      ...filtered.map((registration) => [
        attendeeName(registration),
        attendeeEmail(registration),
        statusLabel(registration.status),
        registration.answersSummary ??
          JSON.stringify(registration.answers ?? {}),
        registration.ticket?.qrPayload ?? '',
      ]),
    ]
    const text = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `access-needs-${selectedEventId ?? 'event'}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (fixtureState === 'empty') {
    return (
      <DataStateView
        state="empty"
        title="No registrations in this fixture"
        description="Switch the data state to Default to load the sample registrations."
      />
    )
  }

  if (eventQuery.isPending) {
    return (
      <DataStateView
        state="loading"
        title="Loading registrations"
        description="Fetching confirmed, waitlisted and cancelled registrations."
      />
    )
  }
  if (eventQuery.isError || !eventQuery.data) {
    return (
      <DataStateView
        state="error"
        title="Registrations could not load"
        description="The admin API returned an error. No partial attendee list is shown."
        onRetry={() =>
          fixtureState === 'error'
            ? setFixtureState('default')
            : void eventQuery.refetch()
        }
      />
    )
  }

  const event = eventQuery.data
  const seatsLeft =
    event.capacity != null
      ? Math.max(0, event.capacity - confirmed.length)
      : null

  return (
    <div className="space-y-4">
      <PageHeader
        title="Registrations"
        description={`${event.title} · ${confirmed.length} of ${event.capacity ?? '—'} confirmed · ${seatsLeft ?? '—'} places left · ${waitlist.length} waitlisted`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EventScope />
            <Button variant="outline" size="sm" onClick={exportNeeds}>
              <DownloadSimple className="size-3.5" weight="bold" /> Export
              access needs
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Capacity" description="Server-enforced">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {confirmed.length}
          </p>
          <p className="text-xs text-muted-foreground">
            registered of {event.capacity ?? '—'}. Overbooking is rejected by
            the server.
          </p>
          <div className="mt-2">
            <MetricBar
              value={confirmed.length}
              max={Math.max(event.capacity ?? confirmed.length, 1)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Waitlist"
          description={`${waitlist.length} waiting · FIFO · 24h confirm-by`}
        >
          {offer ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                {offer.attendeeName}
              </p>
              <p className="text-xs text-muted-foreground">
                has an offer · confirm-by {formatDateTime(offer.expiresAt)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                No further promotion until it is accepted or withdrawn. This is
                the same offer shown on the overview.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => acceptOffer(offer.eventId)}
                  disabled={isStale}
                >
                  Accept offer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => withdrawOffer(offer.eventId)}
                  disabled={isStale}
                >
                  Withdraw offer
                </Button>
              </div>
            </>
          ) : (seatsLeft ?? 0) > 0 && waitlist.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                {attendeeName(waitlist[0].registration)} is next
              </p>
              <p className="text-xs text-muted-foreground">
                {seatsLeft} place{seatsLeft === 1 ? '' : 's'} free, so an offer
                can be sent. Position {waitlist[0].waitlistPosition}.
              </p>
              <Button
                className="mt-2"
                size="sm"
                onClick={() =>
                  selectedEventId &&
                  sendOffer(selectedEventId, waitlist[0].registration)
                }
                disabled={isStale}
              >
                <Ticket className="size-3.5" weight="bold" /> Send offer
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {waitlist.length > 0
                ? 'No places free. The waitlist stays FIFO until a cancellation frees one.'
                : 'No one is waiting.'}
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Ordered waitlist"
        description="A freed place goes to the next person by position, then by registration time."
      >
        {waitlist.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No waitlisted registrations.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {waitlist.map((entry) => (
              <li
                key={entry.registration.id}
                className="flex flex-wrap items-center gap-3 py-2 text-xs"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-muted font-bold text-foreground">
                  {entry.waitlistPosition}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    {attendeeName(entry.registration)}
                  </span>
                  <span className="block text-muted-foreground">
                    {attendeeEmail(entry.registration)} · joined{' '}
                    {formatDateTime(entry.registration.createdAt)}
                  </span>
                </span>
                {offer?.registrationId === entry.registration.id ? (
                  <MicePill tone="gold">Offered</MicePill>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit waitlist entry for ${attendeeName(entry.registration)}`}
                  onClick={() => setEditing(entry.registration)}
                  disabled={isStale}
                >
                  <PencilSimple className="size-3.5" weight="bold" />
                </Button>
              </li>
            ))}
          </ol>
        )}
        <LocalActionNote>
          Waitlist offers are local workflow state. They use the same record
          here and on the overview.
        </LocalActionNote>
      </SectionCard>

      <SectionCard
        title="Attendees"
        description={`Showing ${filtered.length} of ${effective.length} in this workspace`}
      >
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name or ticket code"
          isFiltered={Boolean(search) || state !== 'all'}
          onReset={() => {
            setSearch('')
            setState('all')
          }}
        >
          <label className="text-xs font-semibold text-muted-foreground">
            <span className="sr-only">Registration state</span>
            <select
              aria-label="Filter by registration state"
              value={state}
              onChange={(change) => setState(change.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
            >
              <option value="all">All registrations</option>
              <option value="checked">Checked in</option>
              <option value="not-checked">Not checked in</option>
              <option value="waitlist">Waitlist</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </FilterBar>

        <div className="mt-3">
          <SimpleTable
            caption="Registrations for the selected event"
            rows={filtered}
            isLoading={registrationsQuery.isPending}
            isError={registrationsQuery.isError}
            onRetry={() => void registrationsQuery.refetch()}
            emptyTitle="No registration matches"
            emptyDescription="Clear the search or choose another registration state."
            columns={[
              {
                header: 'Attendee',
                cell: (registration) => (
                  <span>
                    <span className="font-semibold text-foreground">
                      {attendeeName(registration)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {attendeeEmail(registration)}
                    </span>
                  </span>
                ),
              },
              {
                header: 'Status',
                cell: (registration) => (
                  <MicePill tone={StatusTone(registration.status)}>
                    {statusLabel(registration.status)}
                  </MicePill>
                ),
              },
              {
                header: 'Access needs',
                cell: (registration) => (
                  <span className="text-xs">
                    {registration.answersSummary ??
                      registration.answers?.accessibility ??
                      'None recorded'}
                  </span>
                ),
              },
              {
                header: 'Ticket',
                cell: (registration) =>
                  registration.status === 'waitlisted' ||
                  registration.status === 'cancelled' ? (
                    '—'
                  ) : registration.ticket?.qrPayload ? (
                    <span className="font-mono text-[11px]">
                      {registration.ticket.qrPayload.slice(0, 18)}…
                    </span>
                  ) : (
                    'Not issued'
                  ),
              },
              {
                header: 'Actions',
                cell: (registration) => (
                  <span className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Edit ${attendeeName(registration)}`}
                      onClick={() => setEditing(registration)}
                      disabled={isStale}
                    >
                      <PencilSimple className="size-3.5" weight="bold" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Cancel ${attendeeName(registration)}`}
                      onClick={() => setCancelling(registration)}
                      disabled={isStale}
                    >
                      <UserMinus className="size-3.5" weight="bold" /> Cancel
                    </Button>
                  </span>
                ),
              },
            ]}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Export includes access needs, never reporter identities.{' '}
          {formatDateRange(event.startsAt, event.endsAt)} ·{' '}
          {event.venue?.name ?? 'No venue'}
        </p>
      </SectionCard>

      <EditRegistrationDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        registration={editing}
        onSubmit={(patch) => {
          if (!editing || !selectedEventId) return
          overrideRegistration(selectedEventId, editing.id, patch)
          setEditing(null)
        }}
      />

      <FormDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelling(null)
            setCancelReason('')
          }
        }}
        title={
          cancelling
            ? `Cancel ${attendeeName(cancelling)}`
            : 'Cancel registration'
        }
        description="Cancelling frees a place for the next person on the waitlist. The reason is written to the audit log."
        submitLabel="Cancel registration"
        variant="destructive"
        fieldErrors={
          cancelReason.trim() ? undefined : { reason: 'A reason is required.' }
        }
        onSubmit={() => {
          if (!cancelling || !selectedEventId || !cancelReason.trim()) return
          cancelRegistration(selectedEventId, cancelling, cancelReason.trim())
          setCancelling(null)
          setCancelReason('')
        }}
      >
        <label
          htmlFor="cancel-reason"
          className="text-xs font-bold text-foreground"
        >
          Reason
        </label>
        <Textarea
          id="cancel-reason"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="e.g. attendee request"
        />
        <Notice tone="info">
          This is a local correction. The contract has no admin registration
          cancel endpoint yet.
        </Notice>
      </FormDialog>
    </div>
  )
}

function EditRegistrationDialog({
  open,
  onOpenChange,
  registration,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  registration: AdminRegistration | null
  onSubmit: (patch: {
    attendeeName?: string
    attendeeEmail?: string
    answersSummary?: string
  }) => void
}) {
  const [name, setName] = useState(registration?.attendee?.displayName ?? '')
  const [email, setEmail] = useState(registration?.attendee?.email ?? '')
  const [answers, setAnswers] = useState(registration?.answersSummary ?? '')

  useEffect(() => {
    if (!open) return
    setName(registration?.attendee?.displayName ?? '')
    setEmail(registration?.attendee?.email ?? '')
    setAnswers(registration?.answersSummary ?? '')
  }, [
    open,
    registration?.answersSummary,
    registration?.attendee?.displayName,
    registration?.attendee?.email,
  ])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit registration"
      description="Corrections keep the same registration id and audit the change."
      submitLabel="Save correction"
      onSubmit={() =>
        onSubmit({
          attendeeName: name,
          attendeeEmail: email,
          answersSummary: answers,
        })
      }
    >
      <div className="space-y-1">
        <label
          htmlFor="edit-reg-name"
          className="text-xs font-bold text-foreground"
        >
          Attendee name
        </label>
        <Input
          id="edit-reg-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="edit-reg-email"
          className="text-xs font-bold text-foreground"
        >
          Email
        </label>
        <Input
          id="edit-reg-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="edit-reg-answers"
          className="text-xs font-bold text-foreground"
        >
          Answers summary
        </label>
        <Textarea
          id="edit-reg-answers"
          value={answers}
          onChange={(event) => setAnswers(event.target.value)}
        />
      </div>
      <LocalActionNote />
    </FormDialog>
  )
}
