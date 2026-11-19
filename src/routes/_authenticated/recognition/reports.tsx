import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Can } from '#/components/shell/Gates'
import { useRecognition } from '#/lib/recognition/store'
import { formatDateTime, formatDeadline, relativeAge } from '#/lib/recognition/format'
import { MODERATION_KIND_LABEL, TRIAGE_HOURS } from '#/lib/recognition/logic'
import { AdminPage, DataState, Notice, ScopeNote, StatusPill } from '#/components/recognition/shared'
import { ModerationDialog, ReasonDialog } from '#/components/recognition/dialogs'
import type { ModerationCase, ModerationDecision } from '#/lib/recognition/types'

export const Route = createFileRoute('/_authenticated/recognition/reports')({
  component: ReportsPage,
})

type CaseFilter = 'open' | 'all' | 'resolved'

function ReportsPage() {
  const { state, actions, loads, can } = useRecognition()
  const [filter, setFilter] = useState<CaseFilter>('open')
  const [selected, setSelected] = useState<ModerationCase | null>(null)
  const [deciding, setDeciding] = useState<ModerationCase | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [reopening, setReopening] = useState<ModerationCase | null>(null)
  const [reopenError, setReopenError] = useState<string | null>(null)

  const visible = useMemo(() => {
    return state.moderation.filter((entry) => {
      const resolved = entry.status === 'decided' || entry.status === 'closed'
      if (filter === 'open') return !resolved
      if (filter === 'resolved') return resolved
      return true
    })
  }, [state.moderation, filter])

  const openCount = state.moderation.filter(
    (entry) => entry.status !== 'decided' && entry.status !== 'closed'
  ).length
  const overdue = state.moderation.filter((entry) => {
    const resolved = entry.status === 'decided' || entry.status === 'closed'
    if (resolved) return false
    return new Date(entry.createdAt).getTime() + TRIAGE_HOURS * 3_600_000 < Date.now()
  }).length

  if (loads.moderation === 'loading' && state.moderation.length === 0) {
    return (
      <AdminPage kicker="Recognition · Names & reports" title="Names & reports">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    )
  }

  return (
    <AdminPage
      kicker="Recognition · Names & reports"
      title="Names & reports"
      sub="Display-name moderation and cheating reports. Reporter identity is private; no direct messaging between readers."
      actions={
        <span className="text-xs font-semibold text-muted-foreground">{TRIAGE_HOURS}-hour triage target</span>
      }
    >
      <ScopeNote>
        {openCount} open · {overdue} past the {TRIAGE_HOURS}h target · decisions require a reason and are
        appealable
      </ScopeNote>

      {overdue > 0 ? (
        <Notice
          tone="red"
          title={`${overdue} case${overdue === 1 ? '' : 's'} past the ${TRIAGE_HOURS}-hour target.`}
        >
          Age is measured from the report. Disqualification is appealable; a decision does not delete the
          case.
        </Notice>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Case filters">
          {(
            [
              ['open', 'Open'],
              ['all', 'All cases'],
              ['resolved', 'Resolved'],
            ] as [CaseFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <caption className="sr-only">Moderation queue with age against the target</caption>
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="px-4 py-3">
                  Type
                </th>
                <th scope="col" className="px-4 py-3">
                  Subject
                </th>
                <th scope="col" className="px-4 py-3">
                  Reason
                </th>
                <th scope="col" className="px-4 py-3">
                  Reporter
                </th>
                <th scope="col" className="px-4 py-3">
                  Age
                </th>
                <th scope="col" className="px-4 py-3">
                  Target
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => {
                const resolved = entry.status === 'decided' || entry.status === 'closed'
                const deadline = new Date(
                  new Date(entry.createdAt).getTime() + TRIAGE_HOURS * 3_600_000
                ).toISOString()
                return (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3">
                      <StatusPill status="draft" label={MODERATION_KIND_LABEL[entry.kind] ?? entry.kind} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">{entry.subject}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{entry.id}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{entry.reason}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{entry.reporter}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {relativeAge(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {resolved ? (
                        <span className="text-muted-foreground">Met</span>
                      ) : (
                        <span className="font-semibold text-destructive dark:text-red-300">
                          {formatDeadline(deadline)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={resolved ? 'decided' : entry.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => setSelected(entry)}>
                          View
                        </Button>
                        {!resolved ? (
                          <Can permission="recognition.moderate">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDecisionError(null)
                                setDeciding(entry)
                              }}
                            >
                              Decide
                            </Button>
                          </Can>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {filter === 'open' ? 'No open cases. The queue is clear.' : 'No cases in this view.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Notice tone="neutral" title="A retraction keeps private progress.">
        A retraction or disqualification removes the public signal but keeps private progress and badges.
        Every decision requires a reason and is audited; reporter identity is never disclosed to the affected
        reader.
      </Notice>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${MODERATION_KIND_LABEL[selected.kind]} · ${selected.id} · reported ${formatDateTime(selected.createdAt)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Reported reason" value={selected.reason} />
                <Field label="Evidence" value={selected.evidence} />
                <Field label="Reporter" value={selected.reporter} />
                <Field label="Status" value={selected.status} />
                <Field label="Decision" value={selected.decision} />
                <Field
                  label="Decided"
                  value={selected.decidedAt ? formatDateTime(selected.decidedAt) : '—'}
                />
              </div>
              {selected.resolution ? <Field label="Resolution" value={selected.resolution} /> : null}
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Linked records</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/recognition/leaderboard">
                      <ArrowSquareOut className="h-4 w-4" weight="duotone" /> Leaderboard entry
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/recognition/audit">Audit trail</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/recognition/awards">Award ledger</Link>
                  </Button>
                </div>
                <p className="mt-2">
                  Notification outcome: the affected reader is told the decision and the appeal window, never
                  the reporter.
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {selected && selected.status !== 'decided' && selected.status !== 'closed' ? (
              <Can permission="recognition.moderate">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReopenError(null)
                    setReopening(selected)
                    setSelected(null)
                  }}
                >
                  Reopen case
                </Button>
                <Button
                  onClick={() => {
                    setDecisionError(null)
                    setDeciding(selected)
                    setSelected(null)
                  }}
                >
                  Decide
                </Button>
              </Can>
            ) : selected ? (
              <Can permission="recognition.moderate">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReopenError(null)
                    setReopening(selected)
                    setSelected(null)
                  }}
                >
                  Reopen case
                </Button>
              </Can>
            ) : null}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModerationDialog
        open={Boolean(deciding)}
        onOpenChange={(open) => {
          if (!open) setDeciding(null)
        }}
        entry={deciding}
        pending={pending}
        error={decisionError}
        canDisqualify={can('recognition.disqualify')}
        onSubmit={async (decision: ModerationDecision, reason) => {
          if (!deciding) return
          setPending(true)
          setDecisionError(null)
          try {
            await actions.decideCase(deciding.id, decision, reason)
            setDeciding(null)
          } catch (cause) {
            setDecisionError(cause instanceof Error ? cause.message : 'Could not record the decision.')
          } finally {
            setPending(false)
          }
        }}
      />

      <ReasonDialog
        open={Boolean(reopening)}
        onOpenChange={(open) => {
          if (!open) setReopening(null)
        }}
        title={reopening ? `Reopen ${reopening.id}?` : 'Reopen case'}
        description="Reopening returns the case to the queue. The previous decision stays on the record."
        confirmLabel="Reopen case"
        minLength={10}
        error={reopenError}
        onConfirm={(reason) => {
          if (!reopening) return
          try {
            actions.reopenCase(reopening.id, reason)
            setReopening(null)
          } catch (cause) {
            setReopenError(cause instanceof Error ? cause.message : 'Could not reopen the case.')
          }
        }}
      />
    </AdminPage>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  )
}
