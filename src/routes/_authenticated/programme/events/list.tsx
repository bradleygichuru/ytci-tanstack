/**
 * Events list.
 *
 * The row shows the live status and any staged revision side by side, plus the
 * organizer's verification state. Pagination is client-side in the shared table.
 */
import { useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Copy, Plus } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { FilterBar } from '#/components/shell/FilterBar'
import { FormDialog } from '#/components/shell/FormDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { useMice } from '#/lib/mice/store'
import {
  EVENT_CLASS_LABEL,
  formatDateRange,
  TRUST_TIER_LABEL,
} from '#/lib/mice/workflow'
import {
  MicePill,
  Notice,
  SectionCard,
  SimpleTable,
  StatusTone,
  statusLabel,
} from '#/components/mice/shared'
import type { EventWrite } from '#/lib/mice/types'

export const Route = createFileRoute('/_authenticated/programme/events/list')({
  component: EventsListPage,
})

function EventsListPage() {
  const {
    events,
    local,
    eventsQuery,
    organizers,
    venues,
    createEvent,
    isStale,
  } = useMice()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((event) => {
      const revision = local.revisions[event.id]
      const state = event.status
      const derived = revision?.status === 'in_review' ? 'in_review' : state
      if (status !== 'all' && derived !== status) return false
      if (!query) return true
      return `${event.title} ${event.venue?.name ?? ''} ${event.organizer?.displayName ?? ''}`
        .toLowerCase()
        .includes(query)
    })
  }, [events, local.revisions, search, status])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Events"
        description={`Showing ${rows.length} of ${events.length} in this workspace · production holds 18`}
        actions={
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={isStale}
          >
            <Plus className="size-4" weight="bold" /> Create event
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, venue, or organizer"
        isFiltered={Boolean(search) || status !== 'all'}
        onReset={() => {
          setSearch('')
          setStatus('all')
        }}
      >
        <label className="text-xs font-semibold text-muted-foreground">
          <span className="sr-only">Status</span>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="in_review">In review</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
            <option value="unpublished">Unpublished</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </FilterBar>

      <SimpleTable
        caption="Events with live status, staged revision and organizer verification"
        rows={rows}
        isLoading={eventsQuery.isPending}
        isError={eventsQuery.isError}
        onRetry={() => void eventsQuery.refetch()}
        emptyTitle="No events match"
        emptyDescription="Clear the search or choose another status."
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
          {
            header: 'Class',
            cell: (event) => EVENT_CLASS_LABEL[event.eventClass],
          },
          {
            header: 'Status',
            cell: (event) => {
              const revision = local.revisions[event.id]
              const state = event.status
              return (
                <span className="flex flex-col gap-1">
                  <MicePill
                    tone={StatusTone(
                      revision?.status === 'in_review' ? 'in_review' : state,
                    )}
                  >
                    {revision?.status === 'in_review'
                      ? 'In review'
                      : statusLabel(state)}
                  </MicePill>
                  {revision ? (
                    <span className="text-[10px] text-muted-foreground">
                      Live {statusLabel(event.status)}
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
            cell: (event) => {
              const profile = organizers.find(
                (item) => item.slug === event.organizer?.slug,
              )
              return (
                <span>
                  {event.organizer?.displayName ?? '—'}
                  <span className="block text-xs text-muted-foreground">
                    {profile
                      ? (TRUST_TIER_LABEL[profile.trustTier] ??
                        profile.trustTier)
                      : event.organizer?.label}
                  </span>
                  {profile && profile.verificationStatus !== 'verified' ? (
                    <MicePill tone="gold" className="mt-1">
                      {statusLabel(profile.verificationStatus ?? 'unverified')}
                    </MicePill>
                  ) : null}
                </span>
              )
            },
          },
          {
            header: 'Actions',
            cell: (event) => (
              <span className="flex flex-wrap justify-end gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/programme/events/$eventId"
                    params={{ eventId: event.id }}
                    aria-label={`Edit ${event.title}`}
                  >
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Duplicate ${event.title}`}
                  disabled={isStale}
                  onClick={() => {
                    const venue = venues.find(
                      (item) => item.slug === event.venue?.slug,
                    )
                    const organizer = organizers.find(
                      (item) => item.slug === event.organizer?.slug,
                    )
                    const write: EventWrite = {
                      title: `${event.title} (copy)`,
                      eventClass: event.eventClass,
                      format: event.format,
                      access: event.access,
                      type: EVENT_CLASS_LABEL[event.eventClass],
                      eventDate: event.startsAt.slice(0, 10),
                      endDate: event.endsAt ? event.endsAt.slice(0, 10) : null,
                      timezone: event.timezone,
                      capacity: event.capacity ?? null,
                      registrationMode: event.registrationMode ?? 'none',
                      venueId: venue?.id ?? undefined,
                      organizerProfileId: organizer?.id ?? undefined,
                    }
                    void createEvent(write).then((created) => {
                      if (created)
                        void navigate({
                          to: '/programme/events/$eventId',
                          params: { eventId: created.id },
                        })
                    })
                  }}
                >
                  <Copy className="size-3.5" weight="bold" /> Duplicate
                </Button>
              </span>
            ),
          },
        ]}
      />

      <SectionCard
        title="Lifecycle jobs"
        description="Cancel, unpublish and archive are named jobs on each event editor."
      >
        <Notice tone="info">
          Open an event to cancel, unpublish, archive, or withdraw a staged
          revision. Every lifecycle change asks for a reason and writes an audit
          row.
        </Notice>
      </SectionCard>

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        venues={venues.map((venue) => ({
          id: venue.id ?? venue.slug,
          name: venue.name,
        }))}
        organizers={organizers.map((organizer) => ({
          id: organizer.id ?? organizer.slug,
          name: organizer.displayName,
        }))}
        onCreate={(write) => createEvent(write)}
        onCreated={(eventId) =>
          void navigate({
            to: '/programme/events/$eventId',
            params: { eventId },
          })
        }
      />
    </div>
  )
}

function CreateEventDialog({
  open,
  onOpenChange,
  venues,
  organizers,
  onCreate,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  venues: Array<{ id: string; name: string }>
  organizers: Array<{ id: string; name: string }>
  onCreate: (write: EventWrite) => Promise<{ id: string } | null>
  onCreated: (eventId: string) => void
}) {
  const [title, setTitle] = useState('')
  const [eventClass, setEventClass] =
    useState<EventWrite['eventClass']>('conference')
  const [eventDate, setEventDate] = useState('')
  const [capacity, setCapacity] = useState('')
  const [venueId, setVenueId] = useState('')
  const [organizerId, setOrganizerId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!title.trim() || !eventDate) {
      setError('A title and start date are required.')
      return
    }
    setPending(true)
    const created = await onCreate({
      title: title.trim(),
      eventClass,
      format: 'in_person',
      access: 'registered',
      type: EVENT_CLASS_LABEL[eventClass],
      eventDate,
      timezone: 'Africa/Nairobi',
      capacity: capacity ? Number(capacity) : null,
      registrationMode: 'rsvp',
      venueId: venueId || undefined,
      organizerProfileId: organizerId || undefined,
    })
    setPending(false)
    if (!created) {
      setError('The draft could not be created. Check the API and try again.')
      return
    }
    onOpenChange(false)
    onCreated(created.id)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create an event draft"
      description="The draft is staged for review. Publishing is a separate step."
      submitLabel="Create draft"
      pending={pending}
      error={error}
      onSubmit={submit}
    >
      <div className="space-y-1">
        <label
          htmlFor="new-event-title"
          className="text-xs font-bold text-foreground"
        >
          Title
        </label>
        <Input
          id="new-event-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="new-event-class"
          className="text-xs font-bold text-foreground"
        >
          Event class
        </label>
        <select
          id="new-event-class"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={eventClass}
          onChange={(event) =>
            setEventClass(event.target.value as EventWrite['eventClass'])
          }
        >
          {Object.entries(EVENT_CLASS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="new-event-date"
            className="text-xs font-bold text-foreground"
          >
            Start date
          </label>
          <Input
            id="new-event-date"
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="new-event-capacity"
            className="text-xs font-bold text-foreground"
          >
            Capacity
          </label>
          <Input
            id="new-event-capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label
          htmlFor="new-event-venue"
          className="text-xs font-bold text-foreground"
        >
          Venue
        </label>
        <select
          id="new-event-venue"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={venueId}
          onChange={(event) => setVenueId(event.target.value)}
        >
          <option value="">Select later</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label
          htmlFor="new-event-organizer"
          className="text-xs font-bold text-foreground"
        >
          Organizer
        </label>
        <select
          id="new-event-organizer"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={organizerId}
          onChange={(event) => setOrganizerId(event.target.value)}
        >
          <option value="">Select later</option>
          {organizers.map((organizer) => (
            <option key={organizer.id} value={organizer.id}>
              {organizer.name}
            </option>
          ))}
        </select>
      </div>
    </FormDialog>
  )
}
