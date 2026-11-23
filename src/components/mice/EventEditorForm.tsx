/**
 * Event editor.
 *
 * Saves a staged revision, never the live listing. Capacity cannot fall below
 * confirmed registrations; accessibility is tri-state and every “Yes” needs a
 * named evidence reference. Publishing happens on the review screen.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  FloppyDisk,
  PaperPlaneTilt,
  Prohibit,
  Warning,
  XCircle,
} from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { FormDialog } from '#/components/shell/FormDialog'
import { useMice } from '#/lib/mice/store'
import {
  ACCESS_FIELDS,
  type AccessibilityWrite,
  type EventDetail,
  type EventWrite,
  type LifecycleState,
  type TriState,
  type VenueWrite,
} from '#/lib/mice/types'
import {
  EVENT_CLASS_LABEL,
  MICE_CLASSES,
  TRUST_TIER_LABEL,
  capacityFloor,
  eventToWrite,
  formatLongDate,
  registrationModeLabel,
  reviewReadiness,
} from '#/lib/mice/workflow'
import {
  LocalActionNote,
  MicePill,
  Notice,
  SectionCard,
  StatusTone,
  statusLabel,
} from '#/components/mice/shared'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Switch } from '#/components/ui/switch'
import { cn } from '#/lib/utils.ts'

const TRACKED_ACCESS = [
  'stepFreeEntrance',
  'accessibleToilet',
  'hearingLoop',
] as const

export function EventEditorForm({ detail }: { detail: EventDetail }) {
  const {
    local,
    actorName,
    venues,
    organizers,
    registrations,
    saveRevision,
    submitRevision,
    withdrawRevision,
    setLifecycle,
    saveVenue,
    markChangedAfterReview,
    isStale,
  } = useMice()
  const revision = local.revisions[detail.id]
  const initial = useMemo<EventWrite>(
    () => revision?.write ?? eventToWrite(detail),
    [detail, revision],
  )
  const [form, setForm] = useState<EventWrite>(initial)
  const [evidence, setEvidence] = useState(
    revision?.accessibilityEvidence ?? '',
  )
  const [notice, setNotice] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleState | null>(
    null,
  )
  const [lifecycleReason, setLifecycleReason] = useState('')
  const [venueOpen, setVenueOpen] = useState(false)

  // Reset only when the revision identity changes. Editing an in-review draft
  // marks it changed without discarding the operator's unsaved edits.
  const revisionKey = revision
    ? `${revision.status}:${revision.submittedAt ?? 'draft'}`
    : 'none'
  const lastRevisionKey = useRef(revisionKey)
  useEffect(() => {
    if (lastRevisionKey.current === revisionKey) return
    lastRevisionKey.current = revisionKey
    setForm(initial)
    setEvidence(revision?.accessibilityEvidence ?? '')
  }, [initial, revision?.accessibilityEvidence, revisionKey])

  const confirmed = Math.max(
    capacityFloor(
      detail.capacity != null && detail.seatsRemaining != null
        ? detail.capacity - detail.seatsRemaining
        : null,
    ),
    registrations.filter(
      (registration) =>
        registration.status === 'confirmed' ||
        registration.status === 'checked_in',
    ).length,
  )
  const floor = capacityFloor(confirmed)
  const venue =
    venues.find((item) => item.id === form.venueId) ??
    detail.venueDetail ??
    null
  const organizer =
    organizers.find((item) => item.id === form.organizerProfileId) ??
    detail.organizerDetail ??
    null

  const dirty =
    JSON.stringify(form) !== JSON.stringify(initial) ||
    evidence !== (revision?.accessibilityEvidence ?? '')

  const readiness = reviewReadiness({
    detail,
    write: { ...form, capacity: form.capacity ?? floor },
    accessEvidence: evidence,
    revision,
    venue,
    organizer,
    confirmed,
    actorName,
    secondReviewBy: revision?.secondReview?.by,
  })

  function patch<K extends keyof EventWrite>(key: K, value: EventWrite[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    if (revision?.status === 'in_review') {
      // A material edit after submission invalidates the recorded review.
      markChangedAfterReview(detail.id)
    }
  }

  function patchAccess(key: keyof AccessibilityWrite, value: TriState) {
    setForm((current) => ({
      ...current,
      accessibility: { ...(current.accessibility ?? {}), [key]: value },
    }))
    if (revision?.status === 'in_review') markChangedAfterReview(detail.id)
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = 'A title is required.'
    if (!form.eventDate) next.eventDate = 'A start date is required.'
    if (form.endDate && form.endDate < form.eventDate)
      next.endDate = 'The end date is before the start date.'
    if (typeof form.capacity !== 'number' || Number.isNaN(form.capacity)) {
      next.capacity = 'Enter a number of places.'
    } else if (form.capacity < floor) {
      next.capacity = `Capacity cannot be below ${floor} confirmed registrations.`
    }
    if (form.registrationMode === 'ticket_handoff') {
      if (!form.ticketUrl)
        next.ticketUrl = 'Paid handoff needs the organizer ticket URL.'
      if (!form.priceAmount) next.priceAmount = 'Paid handoff needs a price.'
    }
    const claim = TRACKED_ACCESS.some(
      (key) => form.accessibility?.[key] === 'yes',
    )
    if (claim && !evidence.trim()) {
      next.accessibilityEvidence = 'A “Yes” claim needs an evidence reference.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return false
    }
    return true
  }

  function save() {
    if (!validate()) return
    saveRevision(detail.id, form, evidence.trim())
  }

  function submit() {
    if (!validate()) return
    saveRevision(detail.id, form, evidence.trim())
    window.setTimeout(() => submitRevision(detail.id), 0)
  }

  const canEdit = !isStale
  const status = detail.status
  const staged =
    revision?.status === 'in_review'
      ? 'Revision in review'
      : revision
        ? 'Revision draft'
        : null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <MicePill tone={StatusTone(status)}>{statusLabel(status)}</MicePill>
          {staged ? <MicePill tone="gold">{staged}</MicePill> : null}
          {dirty ? (
            <MicePill tone="gold">Unsaved changes</MicePill>
          ) : (
            <MicePill tone="grey">All changes saved</MicePill>
          )}
          <span className="text-xs text-muted-foreground">
            {revision?.submittedAt
              ? `Submitted ${formatLongDate(revision.submittedAt.slice(0, 10))} by ${revision.submittedBy}`
              : 'Changes are staged on save; publishing is a separate reviewed step.'}
          </span>
        </div>

        {isStale ? (
          <Notice tone="warning" title="Stale snapshot">
            Writes are disabled until a successful sync. The form is read-only;
            search and exports still work.
          </Notice>
        ) : null}

        {status === 'cancelled' || status === 'archived' ? (
          <Notice
            tone="warning"
            title={status === 'cancelled' ? 'Event cancelled' : 'Event archived'}
          >
            Public discovery excludes this event. Restore or publish it from the
            lifecycle controls below to make it visible again.
          </Notice>
        ) : null}

        <SectionCard
          title="Identity"
          description="The slug is locked once the event has been published."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" htmlFor="event-title" error={errors.title}>
              <Input
                id="event-title"
                value={form.title}
                onChange={(event) => patch('title', event.target.value)}
                aria-invalid={errors.title ? true : undefined}
                aria-describedby={
                  errors.title ? 'event-title-error' : undefined
                }
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="event-slug"
              hint={
                detail.slug
                  ? 'Locked: published events keep their URL.'
                  : 'Immutable after first publish.'
              }
            >
              <Input
                id="event-slug"
                value={detail.slug ?? ''}
                readOnly
                className="bg-muted/50"
              />
            </Field>
            <Field
              label="Event class"
              htmlFor="event-class"
              hint="MICE classes require a verified organizer."
            >
              <select
                id="event-class"
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={form.eventClass}
                onChange={(event) =>
                  patch(
                    'eventClass',
                    event.target.value as EventWrite['eventClass'],
                  )
                }
              >
                {(
                  Object.keys(EVENT_CLASS_LABEL) as Array<
                    keyof typeof EVENT_CLASS_LABEL
                  >
                ).map((value) => (
                  <option key={value} value={value}>
                    {EVENT_CLASS_LABEL[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Organizer"
              htmlFor="event-organizer"
              hint={organizerHint(organizer, form.eventClass)}
            >
              <div className="flex gap-2">
                <select
                  id="event-organizer"
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={form.organizerProfileId ?? ''}
                  onChange={(event) =>
                    patch('organizerProfileId', event.target.value || null)
                  }
                >
                  <option value="">Select an organizer</option>
                  {organizers.map((item) => (
                    <option key={item.id ?? item.slug} value={item.id ?? ''}>
                      {item.displayName} ·{' '}
                      {TRUST_TIER_LABEL[item.trustTier] ?? item.trustTier}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field
              label="Editorial theme"
              htmlFor="event-type"
              hint="Free-form theme, not the event class."
            >
              <Input
                id="event-type"
                value={form.type}
                onChange={(event) => patch('type', event.target.value)}
              />
            </Field>
            <Field label="Format" htmlFor="event-format">
              <select
                id="event-format"
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={form.format}
                onChange={(event) =>
                  patch('format', event.target.value as EventWrite['format'])
                }
              >
                <option value="in_person">In person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Schedule and venue"
          description="Dates are validated against the formatted value shown beneath each input."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Venue" htmlFor="event-venue">
              <div className="flex gap-2">
                <select
                  id="event-venue"
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={form.venueId ?? ''}
                  onChange={(event) =>
                    patch('venueId', event.target.value || null)
                  }
                >
                  <option value="">Select a venue</option>
                  {venues
                    .filter((item) => !item.retiredAt)
                    .map((item) => (
                      <option key={item.id ?? item.slug} value={item.id ?? ''}>
                        {item.name}, {item.county}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVenueOpen(true)}
                >
                  Add venue
                </Button>
              </div>
            </Field>
            <Field label="Time zone" htmlFor="event-tz">
              <select
                id="event-tz"
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={form.timezone}
                onChange={(event) => patch('timezone', event.target.value)}
              >
                {[
                  'Africa/Nairobi',
                  'Africa/Kampala',
                  'Africa/Dar_es_Salaam',
                  'UTC',
                ].map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Start date"
              htmlFor="event-start"
              error={errors.eventDate}
              hint={`Shows as ${formatLongDate(form.eventDate)}`}
            >
              <Input
                id="event-start"
                type="date"
                value={form.eventDate}
                onChange={(event) => patch('eventDate', event.target.value)}
                aria-invalid={errors.eventDate ? true : undefined}
                aria-describedby={
                  errors.eventDate ? 'event-start-error' : undefined
                }
              />
              <DateEcho value={form.eventDate} />
            </Field>
            <Field
              label="End date"
              htmlFor="event-end"
              error={errors.endDate}
              hint={`Shows as ${form.endDate ? formatLongDate(form.endDate) : 'Not set'}`}
            >
              <Input
                id="event-end"
                type="date"
                value={form.endDate ?? ''}
                onChange={(event) =>
                  patch('endDate', event.target.value || null)
                }
                aria-invalid={errors.endDate ? true : undefined}
                aria-describedby={
                  errors.endDate ? 'event-end-error' : undefined
                }
              />
              <DateEcho value={form.endDate ?? ''} />
            </Field>
            <Field
              label="Capacity (places)"
              htmlFor="event-capacity"
              error={errors.capacity}
              hint={`Floor ${floor}: ${confirmed} confirmed registration${confirmed === 1 ? '' : 's'}. Changing capacity never cancels a registration.`}
            >
              <Input
                id="event-capacity"
                type="number"
                min={floor}
                value={form.capacity ?? ''}
                onChange={(event) =>
                  patch(
                    'capacity',
                    event.target.value === ''
                      ? null
                      : Number(event.target.value),
                  )
                }
                aria-invalid={errors.capacity ? true : undefined}
                aria-describedby={
                  errors.capacity ? 'event-capacity-error' : undefined
                }
              />
            </Field>
            <Field
              label="Waitlist"
              htmlFor="event-waitlist"
              hint="A freed place is offered to the next person in FIFO order."
            >
              <Input
                id="event-waitlist"
                readOnly
                className="bg-muted/50"
                value={
                  detail.waitlistOpen
                    ? 'Open · FIFO · 24h confirm-by'
                    : 'Closed'
                }
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Registration"
          description="One mode per event; the paid handoff is conditional on ticket handoff."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mode" htmlFor="event-mode">
              <select
                id="event-mode"
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={form.registrationMode ?? 'none'}
                onChange={(event) =>
                  patch(
                    'registrationMode',
                    event.target.value as EventWrite['registrationMode'],
                  )
                }
              >
                <option value="rsvp">RSVP</option>
                <option value="ticket_handoff">Ticket handoff</option>
                <option value="none">None</option>
              </select>
            </Field>
            <Field
              label="Registration contact"
              htmlFor="event-contact"
              hint="Programme mailbox, not an attendee address."
            >
              <Input
                id="event-contact"
                readOnly
                className="bg-muted/50"
                value="programme@ytci.co.ke"
              />
            </Field>
          </div>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Send a change notice on material edits
              </p>
              <p className="text-[11px] text-muted-foreground">
                Time, venue, status, capacity or session changes queue an
                Important notification.
              </p>
            </div>
            <Switch
              checked={notice}
              onCheckedChange={setNotice}
              aria-label="Send change notice on material edits"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Paid handoff"
          description="YTCI does not process payment."
        >
          {form.registrationMode !== 'ticket_handoff' ? (
            <Notice tone="info">
              Not used for{' '}
              {registrationModeLabel(form.registrationMode ?? 'none')} events.
              Switch the mode to Ticket handoff to set a price and ticket URL.
            </Notice>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Price amount"
                htmlFor="event-price"
                error={errors.priceAmount}
              >
                <Input
                  id="event-price"
                  type="number"
                  min={0}
                  value={form.priceAmount ?? ''}
                  onChange={(event) =>
                    patch(
                      'priceAmount',
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  aria-invalid={errors.priceAmount ? true : undefined}
                />
              </Field>
              <Field label="Currency" htmlFor="event-currency">
                <Input
                  id="event-currency"
                  value={form.priceCurrency ?? 'KES'}
                  onChange={(event) =>
                    patch('priceCurrency', event.target.value)
                  }
                />
              </Field>
              <Field
                label="Organizer ticket URL"
                htmlFor="event-ticket-url"
                error={errors.ticketUrl}
                hint="Opens in the organizer's own checkout."
              >
                <Input
                  id="event-ticket-url"
                  type="url"
                  value={form.ticketUrl ?? ''}
                  onChange={(event) =>
                    patch('ticketUrl', event.target.value || null)
                  }
                  aria-invalid={errors.ticketUrl ? true : undefined}
                />
              </Field>
              <Field label="Sales end" htmlFor="event-sales-end">
                <Input
                  id="event-sales-end"
                  type="datetime-local"
                  value={form.salesEnd?.slice(0, 16) ?? ''}
                  onChange={(event) =>
                    patch('salesEnd', event.target.value || null)
                  }
                />
              </Field>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Paid events show “Tickets sold by the organizer”. A handoff records
            interest only; it never counts toward capacity.
          </p>
        </SectionCard>

        <SectionCard
          title="Accessibility"
          description="Tri-state. Unknown is the default and never renders as accessible. A Yes requires an evidence reference."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ACCESS_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                htmlFor={`event-access-${field.key}`}
              >
                <select
                  id={`event-access-${field.key}`}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={form.accessibility?.[field.key] ?? 'unknown'}
                  onChange={(event) =>
                    patchAccess(field.key, event.target.value as TriState)
                  }
                >
                  <option value="unknown">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
            ))}
          </div>
          <Field
            label="Accessibility evidence"
            htmlFor="event-accessibility-evidence"
            error={errors.accessibilityEvidence}
            hint="e.g. site inspection 12 Nov 2026. A Yes without a reference blocks publishing."
          >
            <Input
              id="event-accessibility-evidence"
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="e.g. site inspection 12 Nov 2026"
              aria-invalid={errors.accessibilityEvidence ? true : undefined}
            />
          </Field>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Companion ticket policy" htmlFor="event-companion">
              <Input
                id="event-companion"
                value={form.accessibility?.companionTicketPolicy ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accessibility: {
                      ...(current.accessibility ?? {}),
                      companionTicketPolicy: event.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Content notes" htmlFor="event-content-notes">
              <Textarea
                id="event-content-notes"
                value={form.accessibility?.contentNotes ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accessibility: {
                      ...(current.accessibility ?? {}),
                      contentNotes: event.target.value,
                    },
                  }))
                }
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Description"
          description="The public listing reads this field after a revision is approved."
        >
          <Textarea
            aria-label="Event description"
            value={form.description ?? ''}
            onChange={(event) => patch('description', event.target.value)}
            className="min-h-24"
          />
        </SectionCard>

        <SectionCard
          title="Publishing and lifecycle"
          description="Status changes only through review, by a different person from the uploader."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Status"
              htmlFor="event-status"
              hint="The live listing stays up until a revision is approved."
            >
              <Input
                id="event-status"
                readOnly
                className="bg-muted/50"
                value={statusLabel(status)}
              />
            </Field>
            <Field label="Uploader" htmlFor="event-uploader">
              <Input
                id="event-uploader"
                readOnly
                className="bg-muted/50"
                value={revision?.submittedBy ?? '—'}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLifecycleAction(
                  status === 'cancelled' ? 'published' : 'cancelled',
                )
              }
              disabled={!canEdit}
            >
              <Prohibit className="size-3.5" weight="bold" />{' '}
              {status === 'cancelled' ? 'Restore event' : 'Cancel event'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLifecycleAction(
                  status === 'draft' ? 'published' : 'unpublished',
                )
              }
              disabled={!canEdit}
            >
              {status === 'draft' ? 'Re-publish listing' : 'Unpublish listing'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLifecycleAction('archived')}
              disabled={!canEdit}
            >
              Archive event
            </Button>
            {revision ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => withdrawRevision(detail.id)}
                disabled={!canEdit}
              >
                <XCircle className="size-3.5" weight="bold" /> Withdraw staged
                revision
              </Button>
            ) : null}
          </div>
          <LocalActionNote />
        </SectionCard>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <SectionCard
          title="Readiness"
          description={
            readiness.canPublish
              ? 'All blocking checks pass.'
              : 'Publishing stays blocked until every item below is clear.'
          }
        >
          <ul className="space-y-2.5">
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
                    className={cn('mt-0.5 size-4 shrink-0', tone)}
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
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-primary underline underline-offset-2"
                          onClick={() => {
                            const target =
                              document.getElementById(`event-${item.field}`) ??
                              document.getElementById(
                                'event-accessibility-evidence',
                              ) ??
                              document.getElementById('event-title')
                            target?.focus()
                          }}
                        >
                          Resolve this blocker
                        </button>
                      </>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
          <Button className="mt-4 w-full" onClick={save} disabled={!canEdit}>
            <FloppyDisk className="size-4" weight="bold" />{' '}
            {detail.status === 'published'
              ? 'Save staged changes'
              : 'Save draft'}
          </Button>
          <Button
            className="mt-2 w-full"
            variant="secondary"
            onClick={submit}
            disabled={!canEdit}
          >
            <PaperPlaneTilt className="size-4" weight="bold" />{' '}
            {detail.status === 'published'
              ? 'Send revision for review'
              : 'Submit for review'}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Reviewer must differ from {revision?.submittedBy ?? 'the uploader'}.
          </p>
        </SectionCard>

        <SectionCard title="Capacity floor" description="Server-enforced">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {confirmed}
          </p>
          <p className="text-xs text-muted-foreground">
            confirmed of {form.capacity ?? 0} · floor {floor}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${form.capacity ? Math.min(100, (confirmed / form.capacity) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            A downgrade below {floor} is rejected in the form and by the server.
            No registration is cancelled by a capacity change.
          </p>
        </SectionCard>

        <Notice tone="info" title="Local revision">
          The staged revision lives in this browser until you publish. The live
          listing is unchanged, and the contract has no separate draft endpoint
          yet.
        </Notice>
      </aside>

      <FormDialog
        open={Boolean(lifecycleAction)}
        onOpenChange={(open) => {
          if (!open) {
            setLifecycleAction(null)
            setLifecycleReason('')
          }
        }}
        title={`Mark event ${lifecycleAction ?? 'published'}`}
        description="A reason is required and the change is written to the audit log."
        submitLabel="Record lifecycle change"
        variant={
          lifecycleAction === 'cancelled' || lifecycleAction === 'archived'
            ? 'destructive'
            : 'default'
        }
        fieldErrors={
          lifecycleReason.trim()
            ? undefined
            : { reason: 'A reason is required.' }
        }
        onSubmit={() => {
          if (!lifecycleAction || !lifecycleReason.trim()) return
          const action = lifecycleAction
          const reason = lifecycleReason.trim()
          setLifecycleAction(null)
          setLifecycleReason('')
          void setLifecycle(detail.id, action, reason)
        }}
      >
        <Field label="Reason" htmlFor="lifecycle-reason">
          <Textarea
            id="lifecycle-reason"
            value={lifecycleReason}
            onChange={(event) => setLifecycleReason(event.target.value)}
            placeholder="Why is this listing changing state?"
          />
        </Field>
        <LocalActionNote />
      </FormDialog>

      <VenueCreateDialog
        open={venueOpen}
        onOpenChange={setVenueOpen}
        saveVenue={saveVenue}
      />
    </div>
  )
}

function DateEcho({ value }: { value: string }) {
  if (!value) return null
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
      <CalendarBlank className="size-3.5" weight="bold" aria-hidden />{' '}
      {formatLongDate(value)}
    </p>
  )
}

function organizerHint(
  organizer: EventDetail['organizerDetail'] | undefined | null,
  eventClass: string,
) {
  if (!organizer) return 'No organizer linked. Pick one before saving.'
  const tier = TRUST_TIER_LABEL[organizer.trustTier] ?? organizer.trustTier
  const mice = (MICE_CLASSES as readonly string[]).includes(eventClass)
  const status = organizer.verificationStatus ?? 'unverified'
  if (status === 'verified') {
    return `${tier} · verified${organizer.verificationExpiresAt ? `, renews ${formatLongDate(organizer.verificationExpiresAt.slice(0, 10))}` : ''}.`
  }
  if (status === 'pending')
    return `${tier} · verification pending. ${mice ? 'MICE classes cannot be published.' : 'Community classes only.'}`
  if (status === 'revoked')
    return `${tier} · verification revoked. MICE classes cannot be published.`
  if (status === 'expired')
    return `${tier} · renewal overdue. MICE classes cannot be published.`
  return `${tier} · not verified. ${mice ? 'MICE classes cannot be published.' : 'Community classes only.'}`
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-bold text-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="flex items-center gap-1 text-[11px] font-semibold text-destructive"
        >
          <Warning className="size-3.5" weight="bold" aria-hidden /> {error}
        </p>
      ) : null}
    </div>
  )
}

function VenueCreateDialog({
  open,
  onOpenChange,
  saveVenue,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  saveVenue: (venueId: string | null, write: VenueWrite) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [county, setCounty] = useState('Nairobi')
  const [capacity, setCapacity] = useState('')
  const [address, setAddress] = useState('')
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!name.trim() || !county.trim()) return
    setPending(true)
    const ok = await saveVenue(null, {
      name: name.trim(),
      county: county.trim(),
      addressLine1: address.trim() || undefined,
      capacityInPerson: capacity ? Number(capacity) : null,
      accessibility: {
        stepFreeEntrance: 'unknown',
        stepFreeRoute: 'unknown',
        accessibleToilet: 'unknown',
        hearingLoop: 'unknown',
      },
    })
    setPending(false)
    if (ok) {
      onOpenChange(false)
      setName('')
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a curated venue"
      description="Accessibility starts as Unknown; add evidence on the venue record after saving."
      submitLabel="Create venue"
      pending={pending}
      onSubmit={submit}
    >
      <Field label="Venue name" htmlFor="new-venue-name">
        <Input
          id="new-venue-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label="County" htmlFor="new-venue-county">
        <Input
          id="new-venue-county"
          value={county}
          onChange={(event) => setCounty(event.target.value)}
        />
      </Field>
      <Field label="Address" htmlFor="new-venue-address">
        <Input
          id="new-venue-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </Field>
      <Field label="In-person capacity" htmlFor="new-venue-capacity">
        <Input
          id="new-venue-capacity"
          type="number"
          min={0}
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
        />
      </Field>
    </FormDialog>
  )
}
