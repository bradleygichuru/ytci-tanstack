/**
 * Event report moderation.
 *
 * Age is measured against a 48-hour triage target. A decision needs a note;
 * escalation stays open and is visible on the row until a decision is recorded.
 */
import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowSquareOut, Flag, ShieldWarning } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { FilterBar } from '#/components/shell/FilterBar'
import { FormDialog } from '#/components/shell/FormDialog'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { useMice } from '#/lib/mice/store'
import { reportAgeHours, reportTarget } from '#/lib/mice/workflow'
import {
  MicePill,
  Notice,
  SectionCard,
  SimpleTable,
  StatusTone,
  statusLabel,
} from '#/components/mice/shared'
import type { EventReport } from '#/lib/mice/types'

export const Route = createFileRoute(
  '/_authenticated/programme/events/reports',
)({
  component: ReportsPage,
})

const ASSIGNEES = ['Amina Hassan', 'Brian Otieno', 'Grace Wambui']
const REPORT_LABEL: Record<string, string> = {
  impersonation: 'Impersonation',
  safety_concern: 'Safety concern',
  inaccurate_information: 'Inaccurate information',
  spam: 'Spam',
  payment_issue: 'Payment issue',
  accessibility_misrepresentation: 'Accessibility misrepresentation',
}

function ReportsPage() {
  const {
    reports,
    reportsQuery,
    local,
    actorName,
    assignReport,
    escalateReport,
    decideReport,
    isStale,
  } = useMice()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('open')
  const [selected, setSelected] = useState<EventReport | null>(null)
  const [decision, setDecision] = useState<
    'resolve' | 'dismiss' | 'revoke_organizer'
  >('resolve')
  const [note, setNote] = useState('')

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return reports.filter((report) => {
      if (
        filter === 'open' &&
        !(report.status === 'open' || report.status === 'triaged')
      )
        return false
      if (
        filter === 'closed' &&
        !(report.status === 'resolved' || report.status === 'dismissed')
      )
        return false
      if (!query) return true
      return `${report.id} ${report.reason} ${report.details ?? ''}`
        .toLowerCase()
        .includes(query)
    })
  }, [filter, reports, search])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Event reports"
        description="48-hour triage target · reporter identity is private and never shown to the organizer · no public report count"
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search report id, type or detail"
        isFiltered={Boolean(search) || filter !== 'open'}
        onReset={() => {
          setSearch('')
          setFilter('open')
        }}
      >
        <label className="text-xs font-semibold text-muted-foreground">
          <span className="sr-only">Report status</span>
          <select
            aria-label="Filter by report status"
            value={filter}
            onChange={(change) => setFilter(change.target.value)}
            className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
          >
            <option value="open">Open and triaged</option>
            <option value="closed">Resolved and dismissed</option>
            <option value="all">All reports</option>
          </select>
        </label>
      </FilterBar>

      <SimpleTable
        caption="Reports with age, 48-hour target, assignment and decision"
        rows={rows}
        isLoading={reportsQuery.isPending}
        isError={reportsQuery.isError}
        onRetry={() => void reportsQuery.refetch()}
        emptyTitle="No reports match"
        emptyDescription="Clear the search or choose another status."
        columns={[
          {
            header: 'Report',
            cell: (report) => (
              <span>
                <span className="font-semibold text-foreground">
                  {REPORT_LABEL[report.reason] ?? report.reason}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {report.details ?? 'No detail supplied'}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  <MicePill tone={StatusTone(report.status)}>
                    {statusLabel(report.status)}
                  </MicePill>
                  {local.reportAssignments[report.id]?.escalated ? (
                    <MicePill tone="red">Escalated · open</MicePill>
                  ) : null}
                </span>
              </span>
            ),
          },
          {
            header: 'Target',
            cell: (report) => (
              <span className="flex flex-col items-start gap-1 text-xs">
                {report.eventId ? (
                  <Link
                    to="/programme/events/$eventId"
                    params={{ eventId: report.eventId }}
                    className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                  >
                    Event <ArrowSquareOut className="size-3" weight="bold" />
                  </Link>
                ) : null}
                {report.organizerId ? (
                  <Link
                    to="/programme/events/organisers"
                    className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                  >
                    Organizer{' '}
                    <ArrowSquareOut className="size-3" weight="bold" />
                  </Link>
                ) : null}
                {!report.eventId && !report.organizerId ? (
                  <span className="text-muted-foreground">General</span>
                ) : null}
              </span>
            ),
          },
          {
            header: 'Age',
            cell: (report) => {
              const target = reportTarget(report.createdAt)
              return (
                <span
                  className={
                    target.tone === 'late'
                      ? 'text-xs font-bold text-destructive'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {reportAgeHours(report.createdAt)}h
                  <span className="block text-[11px]">{target.label}</span>
                </span>
              )
            },
          },
          {
            header: 'Assigned',
            cell: (report) => (
              <select
                aria-label={`Assign report ${report.id}`}
                className="h-8 rounded-md border border-input bg-transparent px-1 text-xs"
                value={local.reportAssignments[report.id]?.assignedTo ?? ''}
                onChange={(change) =>
                  assignReport(report.id, change.target.value)
                }
              >
                <option value="">Unassigned</option>
                {ASSIGNEES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ),
          },
          {
            header: 'Actions',
            cell: (report) => (
              <span className="flex flex-wrap justify-end gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Escalate ${report.id}`}
                  onClick={() => escalateReport(report.id)}
                  disabled={
                    report.status === 'resolved' ||
                    report.status === 'dismissed' ||
                    isStale
                  }
                >
                  <Flag className="size-3.5" weight="bold" /> Escalate
                </Button>
                <Button
                  size="sm"
                  aria-label={`Decide ${report.id}`}
                  onClick={() => {
                    setSelected(report)
                    setDecision('resolve')
                    setNote('')
                  }}
                  disabled={
                    report.status === 'resolved' ||
                    report.status === 'dismissed' ||
                    isStale
                  }
                >
                  <ShieldWarning className="size-3.5" weight="bold" /> Decide
                </Button>
              </span>
            ),
          },
        ]}
      />

      <SectionCard
        title="Decision standard"
        description="One decision, one note, one audit row"
      >
        <Notice tone="info">
          Resolve for a substantiated report; dismiss when there is no breach;
          revoke the organizer only for a trust failure. Escalation never
          removes the report from this queue.
        </Notice>
      </SectionCard>

      <FormDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setNote('')
          }
        }}
        title={
          selected
            ? `Decide report ${selected.id.slice(0, 8)}`
            : 'Decide report'
        }
        description="The reporter stays private. The decision and note are written to the audit log."
        submitLabel="Record decision"
        variant={decision === 'revoke_organizer' ? 'destructive' : 'default'}
        fieldErrors={
          note.trim() ? undefined : { note: 'A decision note is required.' }
        }
        onSubmit={() => {
          if (!selected || !note.trim()) return
          void decideReport(selected, decision, note.trim()).then((ok) => {
            if (ok) setSelected(null)
          })
        }}
      >
        <p className="text-xs text-muted-foreground">
          {selected
            ? `${REPORT_LABEL[selected.reason] ?? selected.reason} · ${selected.details ?? 'No detail'}`
            : ''}
        </p>
        <label
          htmlFor="report-decision"
          className="text-xs font-bold text-foreground"
        >
          Decision
        </label>
        <select
          id="report-decision"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={decision}
          onChange={(change) =>
            setDecision(change.target.value as typeof decision)
          }
        >
          <option value="resolve">Resolve</option>
          <option value="dismiss">Dismiss</option>
          <option value="revoke_organizer">Resolve and revoke organizer</option>
        </select>
        <label
          htmlFor="report-note"
          className="text-xs font-bold text-foreground"
        >
          Evidence and reasoning
        </label>
        <Textarea
          id="report-note"
          value={note}
          onChange={(change) => setNote(change.target.value)}
          placeholder="What was checked and what happens next."
        />
        <p className="text-[11px] text-muted-foreground">
          Decision by {actorName}. Escalated reports stay open until this is
          submitted.
        </p>
      </FormDialog>
    </div>
  )
}
