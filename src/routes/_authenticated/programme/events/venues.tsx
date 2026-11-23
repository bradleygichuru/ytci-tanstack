/**
 * Venue catalogue.
 *
 * Structured accessibility with per-claim evidence, a separate verification
 * date, and server-backed retire/merge controls so duplicate venue records stop
 * appearing in the event editor. Evidence, retirement and merges are recorded
 * by the API (operations 121–124) and audited in `mice_audit_events`.
 */
import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowsMerge, Paperclip, Plus, Trash } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { FilterBar } from '#/components/shell/FilterBar'
import { FormDialog } from '#/components/shell/FormDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { VenueDialog } from '#/components/mice/VenueDialog'
import { useMice } from '#/lib/mice/store'
import { formatDateTime, formatLongDate } from '#/lib/mice/workflow'
import {
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
  const {
    venues,
    venuesQuery,
    addVenueEvidence,
    retireVenue,
    isStale,
  } = useMice()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Venue | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [evidenceVenue, setEvidenceVenue] = useState<Venue | null>(null)
  const [evidenceClaim, setEvidenceClaim] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [evidenceReference, setEvidenceReference] = useState('')
  const [evidencePending, setEvidencePending] = useState(false)
  const [mergeVenue, setMergeVenue] = useState<Venue | null>(null)
  const [mergeTarget, setMergeTarget] = useState('')
  const [mergePending, setMergePending] = useState(false)
  const [retireVenueRow, setRetireVenueRow] = useState<Venue | null>(null)
  const [retireReason, setRetireReason] = useState('')
  const [retirePending, setRetirePending] = useState(false)

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return venues.filter((venue) => {
      if (venue.retiredAt) return false
      if (!query) return true
      return `${venue.name} ${venue.county} ${venue.addressLine1 ?? ''}`
        .toLowerCase()
        .includes(query)
    })
  }, [search, venues])

  function resetEvidence() {
    setEvidenceVenue(null)
    setEvidenceClaim('')
    setEvidenceNote('')
    setEvidenceReference('')
  }

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
            header: 'Evidence',
            cell: (venue) => {
              const fields = venue.accessibility?.fields
              const latest = venue.evidence?.[0]
              return (
                <span className="text-xs">
                  Step-free:{' '}
                  <strong>{fields?.stepFreeEntrance ?? 'unknown'}</strong> ·
                  Toilet:{' '}
                  <strong>{fields?.accessibleToilet ?? 'unknown'}</strong> ·
                  Listening: <strong>{fields?.hearingLoop ?? 'unknown'}</strong>
                  <span className="block text-[11px] text-muted-foreground">
                    {latest
                      ? `${latest.claim} · ${latest.note}`
                      : 'No claim evidence recorded'}
                  </span>
                  {venue.evidence && venue.evidence.length > 1 ? (
                    <span className="block text-[11px] text-muted-foreground">
                      {venue.evidence.length} evidence records
                    </span>
                  ) : null}
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
                  variant="ghost"
                  size="sm"
                  aria-label={`Add evidence for ${venue.name}`}
                  disabled={isStale}
                  onClick={() => setEvidenceVenue(venue)}
                >
                  <Paperclip className="size-3.5" weight="bold" /> Evidence
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
        retired venue stops appearing in the event editor. Retiring and merging
        are recorded on the server.
      </Notice>

      <VenueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        venue={editing}
      />

      <FormDialog
        open={Boolean(evidenceVenue)}
        onOpenChange={(open) => {
          if (!open) resetEvidence()
        }}
        title={
          evidenceVenue ? `Evidence for ${evidenceVenue.name}` : 'Venue evidence'
        }
        description="One claim per record. Corrections are new rows, so the history stays readable."
        submitLabel="Record evidence"
        pending={evidencePending}
        fieldErrors={{
          ...(evidenceClaim.trim().length < 3
            ? { claim: 'Name the claim in at least 3 characters.' }
            : {}),
          ...(evidenceNote.trim().length < 3
            ? { note: 'Describe what was checked.' }
            : {}),
        }}
        onSubmit={() => {
          if (!evidenceVenue || evidenceClaim.trim().length < 3) return
          setEvidencePending(true)
          void addVenueEvidence(evidenceVenue, {
            claim: evidenceClaim,
            note: evidenceNote,
            reference: evidenceReference || undefined,
          }).then((ok) => {
            setEvidencePending(false)
            if (ok) resetEvidence()
          })
        }}
      >
        <label
          htmlFor="evidence-claim"
          className="text-xs font-bold text-foreground"
        >
          Claim
        </label>
        <Input
          id="evidence-claim"
          value={evidenceClaim}
          onChange={(event) => setEvidenceClaim(event.target.value)}
          placeholder="e.g. Step-free entrance"
        />
        <label
          htmlFor="evidence-note"
          className="text-xs font-bold text-foreground"
        >
          What was checked
        </label>
        <Textarea
          id="evidence-note"
          value={evidenceNote}
          onChange={(event) => setEvidenceNote(event.target.value)}
          placeholder="Who checked it, when, and how."
        />
        <label
          htmlFor="evidence-reference"
          className="text-xs font-bold text-foreground"
        >
          Reference (optional)
        </label>
        <Input
          id="evidence-reference"
          value={evidenceReference}
          onChange={(event) => setEvidenceReference(event.target.value)}
          placeholder="Inspection ticket, photo or report id"
        />
        {evidenceVenue?.evidence?.length ? (
          <div className="rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground">Recent evidence</p>
            <ul className="mt-1 space-y-1">
              {evidenceVenue.evidence.slice(0, 3).map((item) => (
                <li key={item.id}>
                  {formatDateTime(item.createdAt)} · {item.claim} — {item.note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </FormDialog>

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
        pending={mergePending}
        variant="destructive"
        fieldErrors={
          mergeTarget ? undefined : { target: 'Choose a target venue.' }
        }
        onSubmit={() => {
          if (!mergeVenue || !mergeTarget) return
          setMergePending(true)
          void retireVenue(
            mergeVenue,
            `Merged into ${venues.find((venue) => venue.id === mergeTarget)?.name ?? 'another venue'}`,
            mergeTarget,
          ).then((ok) => {
            setMergePending(false)
            if (ok) {
              setMergeVenue(null)
              setMergeTarget('')
            }
          })
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
            .filter(
              (venue) =>
                !venue.retiredAt &&
                venue.id &&
                venue.id !== mergeVenue?.id,
            )
            .map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
        </select>
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
        description="A retired venue stops appearing in the event editor and in public payloads. Existing events keep the reference until merged."
        submitLabel="Retire venue"
        pending={retirePending}
        variant="destructive"
        fieldErrors={
          retireReason.trim() ? undefined : { reason: 'A reason is required.' }
        }
        onSubmit={() => {
          if (!retireVenueRow || !retireReason.trim()) return
          setRetirePending(true)
          void retireVenue(retireVenueRow, retireReason).then((ok) => {
            setRetirePending(false)
            if (ok) {
              setRetireVenueRow(null)
              setRetireReason('')
            }
          })
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
      </FormDialog>
    </div>
  )
}
