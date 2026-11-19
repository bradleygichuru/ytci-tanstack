/**
 * Venue catalogue.
 *
 * Structured accessibility with per-claim evidence, separate verification date,
 * and retire/merge controls so duplicate venue records stop appearing in the
 * event editor.
 */
import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowsMerge, Plus, Trash } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { FilterBar } from '#/components/shell/FilterBar'
import { FormDialog } from '#/components/shell/FormDialog'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { VenueDialog } from '#/components/mice/VenueDialog'
import { useMice } from '#/lib/mice/store'
import { formatLongDate } from '#/lib/mice/workflow'
import {
  LocalActionNote,
  MicePill,
  Notice,
  SimpleTable,
} from '#/components/mice/shared'
import type { Venue } from '#/lib/mice/types'

export const Route = createFileRoute('/_authenticated/programme/events/venues')(
  {
    component: VenuesPage,
  },
)

function VenuesPage() {
  const { venues, venuesQuery, local, retireVenue, isStale } = useMice()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Venue | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mergeVenue, setMergeVenue] = useState<Venue | null>(null)
  const [mergeTarget, setMergeTarget] = useState('')
  const [retireVenueRow, setRetireVenueRow] = useState<Venue | null>(null)
  const [retireReason, setRetireReason] = useState('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return venues.filter((venue) => {
      if (local.venueRetired[venue.id ?? venue.slug]) return false
      if (!query) return true
      return `${venue.name} ${venue.county} ${venue.addressLine1 ?? ''}`
        .toLowerCase()
        .includes(query)
    })
  }, [local.venueRetired, search, venues])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Venues"
        description="Curated venue records · accessibility is structured and never a free-text claim"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" weight="bold" /> Add venue
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search venue or area"
        isFiltered={Boolean(search)}
        onReset={() => setSearch('')}
      />

      <SimpleTable
        caption="Venue records with structured accessibility, evidence and verification"
        rows={rows}
        isLoading={venuesQuery.isPending}
        isError={venuesQuery.isError}
        onRetry={() => void venuesQuery.refetch()}
        emptyTitle="No venues match"
        emptyDescription="Clear the search to see all venue records."
        columns={[
          {
            header: 'Venue',
            cell: (venue) => (
              <span>
                <span className="font-semibold text-foreground">
                  {venue.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {venue.county}
                  {venue.addressLine1 ? ` · ${venue.addressLine1}` : ''}
                </span>
              </span>
            ),
          },
          {
            header: 'Capacity',
            cell: (venue) => (
              <span className="text-xs">
                {venue.capacityInPerson ?? '—'} in person
                <span className="block text-muted-foreground">
                  {venue.capacityOnline ?? '—'} online
                </span>
              </span>
            ),
          },
          {
            header: 'Accessibility',
            cell: (venue) => {
              const fields = venue.accessibility?.fields
              const evidence = venue.id
                ? local.venueEvidence[venue.id]
                : undefined
              return (
                <span className="text-xs">
                  Step-free:{' '}
                  <strong>{fields?.stepFreeEntrance ?? 'unknown'}</strong> ·
                  Toilet:{' '}
                  <strong>{fields?.accessibleToilet ?? 'unknown'}</strong> ·
                  Listening: <strong>{fields?.hearingLoop ?? 'unknown'}</strong>
                  <span className="block text-[11px] text-muted-foreground">
                    {evidence?.note || 'No claim evidence recorded'}
                  </span>
                </span>
              )
            },
          },
          {
            header: 'Verification',
            cell: (venue) =>
              venue.verifiedAt ? (
                <span className="text-xs">
                  {formatLongDate(venue.verifiedAt.slice(0, 10))}
                  <span className="block text-muted-foreground">
                    Accessibility report
                  </span>
                </span>
              ) : (
                <MicePill tone="gold">Unverified</MicePill>
              ),
          },
          {
            header: 'Actions',
            cell: (venue) => (
              <span className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${venue.name}`}
                  disabled={isStale}
                  onClick={() => {
                    setEditing(venue)
                    setDialogOpen(true)
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Merge ${venue.name}`}
                  onClick={() => setMergeVenue(venue)}
                  disabled={isStale}
                >
                  <ArrowsMerge className="size-3.5" weight="bold" /> Merge
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Retire ${venue.name}`}
                  disabled={isStale}
                  onClick={() => setRetireVenueRow(venue)}
                >
                  <Trash className="size-3.5" weight="bold" />
                </Button>
              </span>
            ),
          },
        ]}
      />

      <Notice tone="info" title="Verification is not evidence">
        A venue is “verified” when the record itself was checked. Each
        accessibility claim still needs its own evidence reference, and a
        retired venue stops appearing in the event editor.
      </Notice>
      <LocalActionNote />

      <VenueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        venue={editing}
      />

      <FormDialog
        open={Boolean(mergeVenue)}
        onOpenChange={(open) => {
          if (!open) {
            setMergeVenue(null)
            setMergeTarget('')
          }
        }}
        title={mergeVenue ? `Merge ${mergeVenue.name}` : 'Merge venue'}
        description="Events pointing at the merged venue are re-pointed to the target. The source venue is retired."
        submitLabel="Merge venues"
        variant="destructive"
        fieldErrors={
          mergeTarget ? undefined : { target: 'Choose a target venue.' }
        }
        onSubmit={() => {
          if (!mergeVenue || !mergeTarget) return
          retireVenue(
            mergeVenue.id ?? mergeVenue.slug,
            mergeTarget,
            `Merged into ${mergeTarget}`,
          )
          setMergeVenue(null)
          setMergeTarget('')
        }}
      >
        <label
          htmlFor="merge-target"
          className="text-xs font-bold text-foreground"
        >
          Merge into
        </label>
        <select
          id="merge-target"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={mergeTarget}
          onChange={(event) => setMergeTarget(event.target.value)}
        >
          <option value="">Select a venue</option>
          {venues
            .filter((venue) => venue.slug !== mergeVenue?.slug)
            .map((venue) => (
              <option key={venue.slug} value={venue.slug}>
                {venue.name}
              </option>
            ))}
        </select>
        <LocalActionNote />
      </FormDialog>

      <FormDialog
        open={Boolean(retireVenueRow)}
        onOpenChange={(open) => {
          if (!open) {
            setRetireVenueRow(null)
            setRetireReason('')
          }
        }}
        title={
          retireVenueRow ? `Retire ${retireVenueRow.name}` : 'Retire venue'
        }
        description="A retired venue stops appearing in the event editor. Existing events keep their reference until re-pointed."
        submitLabel="Retire venue"
        variant="destructive"
        fieldErrors={
          retireReason.trim() ? undefined : { reason: 'A reason is required.' }
        }
        onSubmit={() => {
          if (!retireVenueRow || !retireReason.trim()) return
          retireVenue(
            retireVenueRow.id ?? retireVenueRow.slug,
            undefined,
            retireReason.trim(),
          )
          setRetireVenueRow(null)
          setRetireReason('')
        }}
      >
        <label
          htmlFor="retire-reason"
          className="text-xs font-bold text-foreground"
        >
          Reason
        </label>
        <Textarea
          id="retire-reason"
          value={retireReason}
          onChange={(change) => setRetireReason(change.target.value)}
          placeholder="e.g. duplicate of KICC"
        />
        <LocalActionNote />
      </FormDialog>
    </div>
  )
}
