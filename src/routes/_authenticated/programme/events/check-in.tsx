/**
 * Check-in counter.
 *
 * Per-day counts reconcile: imported scanner rows plus console rows equal the
 * shown total. A second scan is refused by the server; undo is a local correction
 * with an audit row. The roster stays hidden until the operator searches.
 */
import { useMemo, useState, type KeyboardEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowCounterClockwise,
  Check,
  MagnifyingGlass,
  ShieldWarning,
} from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { FormDialog } from '#/components/shell/FormDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { useMice } from '#/lib/mice/store'
import {
  attendeeName,
  daysForEvent,
  formatLongDate,
  formatTime,
} from '#/lib/mice/workflow'
import {
  EmptyBlock,
  LocalActionNote,
  MetricBar,
  Notice,
  SectionCard,
  SimpleTable,
  statusLabel,
} from '#/components/mice/shared'
import type { AdminRegistration } from '#/lib/mice/types'

export const Route = createFileRoute(
  '/_authenticated/programme/events/check-in',
)({
  component: CheckInPage,
})

function CheckInPage() {
  const {
    eventQuery,
    fixtureState,
    setFixtureState,
    isStale,
    registrations,
    checkIns,
    local,
    selectedEventId,
    checkIn,
    undoCheckIn,
  } = useMice()
  const days = daysForEvent(eventQuery.data, eventQuery.data?.agenda ?? [])
  const [day, setDay] = useState<string>('')
  const [search, setSearch] = useState('')
  const [overrideFor, setOverrideFor] = useState<AdminRegistration | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const selectedDay =
    day || days[0] || eventQuery.data?.startsAt.slice(0, 10) || ''

  const checkedByRegistration = useMemo(() => {
    const map = new Map<
      string,
      { at: string; source: 'scanner' | 'console'; name: string }
    >()
    for (const row of checkIns) {
      if (!row.registrationId) continue
      map.set(row.registrationId, {
        at: row.checkedInAt,
        source: 'scanner',
        name: row.attendeeName ?? row.registrationId,
      })
    }
    for (const row of local.localCheckIns) {
      if (row.eventId !== selectedEventId) continue
      if (row.removed) {
        map.delete(row.registrationId)
      } else {
        map.set(row.registrationId, {
          at: row.checkedInAt,
          source: 'console',
          name: row.attendeeName,
        })
      }
    }
    return map
  }, [checkIns, local.localCheckIns, selectedEventId])

  const forDay = (iso: string) => iso.slice(0, 10) === selectedDay
  const checkedRows = [...checkedByRegistration.entries()].filter(([, value]) =>
    forDay(value.at),
  )
  const recorded = local.localCheckIns.filter(
    (row) =>
      row.eventId === selectedEventId &&
      !row.removed &&
      forDay(row.checkedInAt),
  ).length
  const imported = Math.max(0, checkedRows.length - recorded)
  const confirmed = registrations.filter(
    (registration) =>
      registration.status === 'confirmed' ||
      registration.status === 'checked_in',
  )
  const total = checkedRows.length

  const query = search.trim().toLowerCase()
  const matches = query
    ? registrations.filter((registration) => {
        const name = attendeeName(registration).toLowerCase()
        const ticket = registration.ticket?.qrPayload?.toLowerCase() ?? ''
        return name.includes(query) || ticket.includes(query)
      })
    : []

  async function checkInRegistration(
    registration: AdminRegistration,
    override = false,
    reason?: string,
  ) {
    if (!selectedEventId) return
    setPendingId(registration.id)
    await checkIn(
      selectedEventId,
      registration,
      override ? { override: true, reason } : { method: 'manual' },
    )
    setPendingId(null)
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const candidate = matches.find(
      (registration) =>
        registration.status === 'confirmed' &&
        !checkedByRegistration.has(registration.id),
    )
    if (candidate) void checkInRegistration(candidate)
  }

  if (fixtureState === 'empty') {
    return (
      <DataStateView
        state="empty"
        title="No check-in data in this fixture"
        description="Switch the data state to Default to load the sample event."
      />
    )
  }

  if (eventQuery.isPending) {
    return (
      <DataStateView
        state="loading"
        title="Loading the check-in counter"
        description="Fetching the event, registrations and today's scans."
      />
    )
  }
  if (eventQuery.isError || !eventQuery.data) {
    return (
      <DataStateView
        state="error"
        title="The counter could not load"
        description="The admin API returned an error. Counts are not shown partially."
        onRetry={() =>
          fixtureState === 'error'
            ? setFixtureState('default')
            : void eventQuery.refetch()
        }
      />
    )
  }

  const event = eventQuery.data
  const open = event.status === 'published' || event.status === 'scheduled'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Check-in"
        description={`Counter · ${formatLongDate(selectedDay)} · ${event.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground">
              <span className="sr-only">Event</span>
              <select
                aria-label="Event scope"
                className="h-8 max-w-[min(28rem,80vw)] rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
                value={selectedEventId ?? ''}
                onChange={() => undefined}
                disabled
              >
                <option value={selectedEventId ?? ''}>{event.title}</option>
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Day
              <select
                aria-label="Check-in day"
                className="ml-2 h-8 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
                value={selectedDay}
                onChange={(change) => setDay(change.target.value)}
              >
                {days.map((value) => (
                  <option key={value} value={value}>
                    {formatLongDate(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />

      {!open ? (
        <Notice tone="info" title="Check-in is not open for this event">
          {event.title} runs {formatLongDate(event.startsAt.slice(0, 10))}. The
          counter opens 90 minutes before the first session.
        </Notice>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <SectionCard
            title="Find a registration"
            description="Name or ticket code. Press Enter to check in the first match."
          >
            <div className="relative">
              <MagnifyingGlass
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                weight="bold"
                aria-hidden
              />
              <Input
                autoFocus
                value={search}
                onChange={(change) => setSearch(change.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="e.g. Demo Attendee or YTC-…"
                aria-label="Search name or ticket code"
                className="pl-8"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              One check-in per registration per day. A second scan shows
              “already checked in” and creates no new record.
            </p>
            <div className="mt-3">
              {query === '' ? (
                <EmptyBlock
                  title="Roster hidden"
                  body="Type at least one character. The attendee list is not rendered until you search."
                />
              ) : matches.length === 0 ? (
                <EmptyBlock
                  title={`No registration matches “${search}”`}
                  body="Search by name or ticket code, or use Override for a registration with a reason."
                />
              ) : (
                <SimpleTable
                  caption="Matching registrations"
                  rows={matches}
                  emptyTitle="No match"
                  emptyDescription="Try another name or ticket code."
                  columns={[
                    {
                      header: 'Attendee',
                      cell: (registration) => (
                        <span>
                          <span className="font-semibold text-foreground">
                            {attendeeName(registration)}
                          </span>
                          <span className="block font-mono text-[11px] text-muted-foreground">
                            {registration.ticket?.qrPayload?.slice(0, 24) ??
                              'No ticket'}
                          </span>
                        </span>
                      ),
                    },
                    {
                      header: 'Access needs',
                      cell: (registration) =>
                        registration.answersSummary ??
                        registration.answers?.accessibility ??
                        'None',
                    },
                    {
                      header: 'Actions',
                      cell: (registration) => {
                        const checked = checkedByRegistration.get(
                          registration.id,
                        )
                        if (checked) {
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                selectedEventId &&
                                undoCheckIn(selectedEventId, registration.id)
                              }
                              disabled={isStale}
                              aria-label={`Undo check-in for ${attendeeName(registration)}`}
                            >
                              <ArrowCounterClockwise
                                className="size-3.5"
                                weight="bold"
                              />{' '}
                              Undo
                            </Button>
                          )
                        }
                        if (
                          registration.status !== 'confirmed' &&
                          registration.status !== 'checked_in'
                        ) {
                          return (
                            <span className="text-xs text-muted-foreground">
                              {statusLabel(registration.status)}
                            </span>
                          )
                        }
                        return (
                          <Button
                            size="sm"
                            onClick={() =>
                              void checkInRegistration(registration)
                            }
                            disabled={pendingId === registration.id || isStale}
                            aria-label={`Check in ${attendeeName(registration)}`}
                          >
                            <Check className="size-3.5" weight="bold" /> Check
                            in
                          </Button>
                        )
                      },
                    },
                  ]}
                />
              )}
            </div>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard
              title={`Checked in · ${formatLongDate(selectedDay)}`}
              description="Counts and records are per day; Day 2 starts at zero."
            >
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {total}
              </p>
              <p className="text-xs text-muted-foreground">
                of {confirmed.length} confirmed ·{' '}
                {Math.max(0, confirmed.length - total)} not yet arrived
              </p>
              <div className="mt-2">
                <MetricBar value={total} max={Math.max(confirmed.length, 1)} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {imported} imported from the door scanner · {recorded} recorded
                in this console. Counts and records are per day.
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => {
                  const candidate = matches.find(
                    (registration) =>
                      registration.status === 'confirmed' &&
                      !checkedByRegistration.has(registration.id),
                  )
                  if (candidate) setOverrideFor(candidate)
                }}
                disabled={matches.length === 0 || isStale}
              >
                <ShieldWarning className="size-3.5" weight="bold" /> Override
                entry
              </Button>
            </SectionCard>

            <SectionCard
              title="Recent"
              description="Last six check-ins for this day"
            >
              {checkedRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No check-ins yet today.
                </p>
              ) : (
                <ul className="space-y-2">
                  {checkedRows
                    .sort((a, b) => b[1].at.localeCompare(a[1].at))
                    .slice(0, 6)
                    .map(([registrationId, value]) => (
                      <li
                        key={registrationId}
                        className="grid grid-cols-[3rem_1fr] gap-2 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {formatTime(value.at)}
                        </span>
                        <span>
                          <span className="block font-semibold text-foreground">
                            {value.name}
                          </span>
                          <span className="block text-muted-foreground">
                            {value.source === 'scanner'
                              ? 'Door scanner'
                              : 'This console'}
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      <FormDialog
        open={Boolean(overrideFor)}
        onOpenChange={(next) => {
          if (!next) {
            setOverrideFor(null)
            setOverrideReason('')
          }
        }}
        title={
          overrideFor
            ? `Override entry for ${attendeeName(overrideFor)}`
            : 'Override entry'
        }
        description="An override is audited and never awards XP or a registration."
        submitLabel="Record override"
        variant="destructive"
        fieldErrors={
          overrideReason.trim()
            ? undefined
            : { reason: 'A reason is required.' }
        }
        onSubmit={() => {
          if (!overrideFor || !overrideReason.trim()) return
          void checkInRegistration(overrideFor, true, overrideReason.trim())
          setOverrideFor(null)
          setOverrideReason('')
        }}
      >
        <p className="text-xs text-muted-foreground">
          {overrideFor
            ? `${attendeeName(overrideFor)} · ${overrideFor.status}`
            : ''}
        </p>
        <label
          htmlFor="override-reason"
          className="text-xs font-bold text-foreground"
        >
          Reason
        </label>
        <Textarea
          id="override-reason"
          value={overrideReason}
          onChange={(change) => setOverrideReason(change.target.value)}
          placeholder="Why is this entry an exception?"
        />
        <Notice tone="warning">
          Walk-in check-in needs a registration record first; the contract
          identifies a check-in by registration or signed ticket.
        </Notice>
        <LocalActionNote>
          Undo is local. Overrides call the staff check-in endpoint.
        </LocalActionNote>
      </FormDialog>
    </div>
  )
}
