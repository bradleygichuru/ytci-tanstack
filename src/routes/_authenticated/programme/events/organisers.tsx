/**
 * Organizer verification.
 *
 * Every decision needs a reason and a person other than the submitter. Requesting
 * more evidence is a server record (operation 124) that keeps the record
 * pending until a decision is recorded; decisions use the verification endpoint.
 */
import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ShieldCheck, ShieldWarning } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { FilterBar } from '#/components/shell/FilterBar'
import { FormDialog } from '#/components/shell/FormDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { useMice } from '#/lib/mice/store'
import {
  formatDateTime,
  formatLongDate,
  TRUST_TIER_LABEL,
} from '#/lib/mice/workflow'
import {
  LocalActionNote,
  MicePill,
  Notice,
  SectionCard,
  SimpleTable,
  StatusTone,
  statusLabel,
} from '#/components/mice/shared'
import type { OrganizerProfile } from '#/lib/mice/types'

export const Route = createFileRoute(
  '/_authenticated/programme/events/organisers',
)({
  component: OrganisersPage,
})

const SUBMITTERS: Record<string, string> = {
  'pending-org': 'Grace Wambui',
  'nairobi-convention-bureau': 'Brian Otieno',
  'swahili-coast-trust': 'Brian Otieno',
  'lake-victoria-youth': 'Grace Wambui',
}

const ASSIGNEES = [
  'Amina Hassan',
  'Brian Otieno',
  'Grace Wambui',
  'Dr. Wanjiku Mwangi',
]

export function OrganiserDecisionForm({
  organizer,
  submitter,
  onSubmit,
}: {
  organizer: OrganizerProfile
  submitter: string
  onSubmit: (
    action: 'verify' | 'reject' | 'revoke' | 'restore' | 'expire',
    reason: string,
    expiresAt?: string | null,
  ) => void
}) {
  const { isStale } = useMice()
  const [action, setAction] = useState<
    'verify' | 'reject' | 'revoke' | 'restore' | 'expire'
  >('verify')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {organizer.displayName} ·{' '}
        {TRUST_TIER_LABEL[organizer.trustTier] ?? organizer.trustTier} ·
        submitted by {submitter}
      </p>
      <div className="space-y-1">
        <label
          htmlFor="org-action"
          className="text-xs font-bold text-foreground"
        >
          Decision
        </label>
        <select
          id="org-action"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={action}
          onChange={(change) => setAction(change.target.value as typeof action)}
        >
          <option value="verify">Verify</option>
          <option value="reject">Reject</option>
          <option value="revoke">Revoke</option>
          <option value="restore">Restore</option>
          <option value="expire">Expire</option>
        </select>
      </div>
      <div className="space-y-1">
        <label
          htmlFor="org-expiry"
          className="text-xs font-bold text-foreground"
        >
          Expiry (verified tiers)
        </label>
        <Input
          id="org-expiry"
          type="date"
          value={expiresAt}
          onChange={(change) => setExpiresAt(change.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="org-reason"
          className="text-xs font-bold text-foreground"
        >
          Reason
        </label>
        <Textarea
          id="org-reason"
          value={reason}
          onChange={(change) => setReason(change.target.value)}
          placeholder="Evidence reviewed and why this decision was made."
        />
      </div>
      {error ? (
        <p className="text-xs font-semibold text-destructive">{error}</p>
      ) : null}
      <Button
        disabled={isStale}
        onClick={() => {
          if (!reason.trim()) {
            setError('A reason is required.')
            return
          }
          setError(null)
          onSubmit(
            action,
            reason.trim(),
            expiresAt ? `${expiresAt}T00:00:00Z` : null,
          )
        }}
      >
        <ShieldCheck className="size-4" weight="bold" /> Record decision
      </Button>
      <LocalActionNote>
        Verification writes the contract endpoint and an append-only audit row.
        Requester ≠ verifier is enforced by the API.
      </LocalActionNote>
    </div>
  )
}

function OrganisersPage() {
  const {
    organizers,
    organizersQuery,
    local,
    actorName,
    noteOrganizer,
    requestOrganizerEvidence,
    decideOrganizer,
    addAudit,
    isStale,
  } = useMice()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<OrganizerProfile | null>(null)
  const [evidenceFor, setEvidenceFor] = useState<OrganizerProfile | null>(null)
  const [evidenceNote, setEvidenceNote] = useState('')
  const [evidencePending, setEvidencePending] = useState(false)

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return organizers.filter(
      (organizer) =>
        !query ||
        `${organizer.displayName} ${organizer.slug}`
          .toLowerCase()
          .includes(query),
    )
  }, [organizers, search])

  const blockedReviews = Object.values(local.revisions).filter((revision) => {
    const organizer = organizers.find(
      (item) => item.id === revision.write.organizerProfileId,
    )
    return (
      revision.status === 'in_review' &&
      organizer?.verificationStatus !== 'verified'
    )
  }).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Organizer verification"
        description={`Signed in as ${actorName} · reviewer ≠ requester · ${blockedReviews} review item${blockedReviews === 1 ? '' : 's'} blocked by organizer trust`}
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search organizer"
        isFiltered={Boolean(search)}
        onReset={() => setSearch('')}
      />

      <SimpleTable
        caption="Organizer verification and renewal dates"
        rows={rows}
        isLoading={organizersQuery.isPending}
        isError={organizersQuery.isError}
        onRetry={() => void organizersQuery.refetch()}
        emptyTitle="No organizers match"
        emptyDescription="Clear the search to see the verification queue."
        columns={[
          {
            header: 'Organizer',
            cell: (organizer) => (
              <span>
                <span className="font-semibold text-foreground">
                  {organizer.displayName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Submitted by {SUBMITTERS[organizer.slug] ?? 'unknown'} ·{' '}
                  {organizer.pastEventCount ?? 0} past events
                </span>
              </span>
            ),
          },
          {
            header: 'Tier',
            cell: (organizer) =>
              TRUST_TIER_LABEL[organizer.trustTier] ?? organizer.trustTier,
          },
          {
            header: 'Status',
            cell: (organizer) => {
              const expired = organizer.verificationExpiresAt
                ? new Date(organizer.verificationExpiresAt) < new Date()
                : false
              const status = expired
                ? 'expired'
                : (organizer.verificationStatus ?? 'unverified')
              return (
                <MicePill tone={StatusTone(status)}>
                  {expired ? 'Renewal overdue' : statusLabel(status)}
                </MicePill>
              )
            },
          },
          {
            header: 'Assigned',
            cell: (organizer) =>
              local.organizerNotes[organizer.id ?? organizer.slug]
                ?.assignedTo ?? 'Unassigned',
          },
          {
            header: 'Renewal',
            cell: (organizer) => {
              const expired = organizer.verificationExpiresAt
                ? new Date(organizer.verificationExpiresAt) < new Date()
                : false
              return (
                <span
                  className={
                    expired ? 'text-xs font-bold text-destructive' : 'text-xs'
                  }
                >
                  {organizer.verificationExpiresAt
                    ? formatLongDate(
                        organizer.verificationExpiresAt.slice(0, 10),
                      )
                    : 'Not set'}
                </span>
              )
            },
          },
          {
            header: 'Actions',
            cell: (organizer) => (
              <span className="flex justify-end gap-1">
                <select
                  aria-label={`Assign ${organizer.displayName}`}
                  className="h-8 rounded-md border border-input bg-transparent px-1 text-xs"
                  value={
                    local.organizerNotes[organizer.id ?? organizer.slug]
                      ?.assignedTo ?? ''
                  }
                  onChange={(change) =>
                    noteOrganizer(organizer.id ?? organizer.slug, {
                      assignedTo: change.target.value,
                    })
                  }
                >
                  <option value="">Unassigned</option>
                  {ASSIGNEES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelected(organizer)}
                  aria-label={`Open evidence for ${organizer.displayName}`}
                >
                  <ShieldWarning className="size-3.5" weight="bold" /> Open
                  evidence
                </Button>
              </span>
            ),
          },
        ]}
      />

      <SectionCard
        title="Evidence policy"
        description="Community organizers never display “Verified”."
      >
        <Notice tone="info">
          Only the assigned reviewer, and never the submitter, can decide. A
          lapsed renewal blocks MICE publication and keeps community events
          available. Requesting more evidence keeps the record pending until a
          decision is recorded.
        </Notice>
        <LocalActionNote>
          Evidence attachments are read from the verification record; requesting
          more evidence is server-backed and audited.
        </LocalActionNote>
      </SectionCard>

      <FormDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        title={
          selected
            ? `Verification decision · ${selected.displayName}`
            : 'Verification decision'
        }
        description="The reason, actor and expiry are written to the append-only audit log."
        submitLabel="Close"
        onSubmit={() => setSelected(null)}
      >
        {selected ? (
          <OrganiserDecisionForm
            organizer={selected}
            submitter={SUBMITTERS[selected.slug] ?? 'unknown'}
            onSubmit={(action, reason, expiresAt) => {
              if (SUBMITTERS[selected.slug] === actorName) {
                addAudit({
                  action: 'Organizer decision refused',
                  entity: selected.displayName,
                  detail: 'The requester cannot decide their own verification',
                  category: 'safety',
                })
                return
              }
              void decideOrganizer(selected, action, reason, expiresAt).then(
                (ok) => {
                  if (ok) setSelected(null)
                },
              )
            }}
          />
        ) : null}
        {selected ? (
          <div className="mt-3 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEvidenceFor(selected)}
              disabled={isStale}
            >
              Request more evidence
            </Button>
            {selected.evidenceRequests?.length ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Latest request {formatDateTime(selected.evidenceRequests[0].createdAt)} ·{' '}
                {selected.evidenceRequests[0].resolvedAt
                  ? 'resolved'
                  : 'open'}
              </p>
            ) : null}
          </div>
        ) : null}
      </FormDialog>

      <FormDialog
        open={Boolean(evidenceFor)}
        onOpenChange={(open) => {
          if (!open) {
            setEvidenceFor(null)
            setEvidenceNote('')
          }
        }}
        title={
          evidenceFor
            ? `Request more evidence · ${evidenceFor.displayName}`
            : 'Request more evidence'
        }
        submitLabel="Send request"
        pending={evidencePending}
        fieldErrors={
          evidenceNote.trim().length >= 10
            ? undefined
            : { note: 'Say in at least 10 characters what evidence is missing.' }
        }
        onSubmit={() => {
          if (!evidenceFor || evidenceNote.trim().length < 10) return
          setEvidencePending(true)
          void requestOrganizerEvidence(
            evidenceFor,
            evidenceNote,
          ).then((ok) => {
            setEvidencePending(false)
            if (ok) {
              setEvidenceFor(null)
              setEvidenceNote('')
            }
          })
        }}
      >
        <label
          htmlFor="evidence-note"
          className="text-xs font-bold text-foreground"
        >
          What is missing?
        </label>
        <Textarea
          id="evidence-note"
          value={evidenceNote}
          onChange={(change) => setEvidenceNote(change.target.value)}
          placeholder="e.g. Current business registration certificate and the venue access audit."
        />
        <LocalActionNote>
          The request is written to the organizer's record and the audit log. The
          record stays pending until a decision is recorded.
        </LocalActionNote>
      </FormDialog>
    </div>
  )
}
