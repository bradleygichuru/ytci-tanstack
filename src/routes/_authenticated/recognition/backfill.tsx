import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowSquareOut, DownloadSimple, Play } from '@phosphor-icons/react'
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
import { formatDateTime, formatNumber, formatXp } from '#/lib/recognition/format'
import { downloadCsv, toCsv } from '#/lib/recognition/logic'
import {
  AdminPage,
  DataState,
  Notice,
  ScopeNote,
  StatusPill,
} from '#/components/recognition/shared'
import { ReasonDialog } from '#/components/recognition/dialogs'
import type { BackfillBatch } from '#/lib/recognition/types'

export const Route = createFileRoute('/_authenticated/recognition/backfill')({
  component: BackfillPage,
})

const WINDOWS = [
  { value: 'last-30', label: 'Last 30 days · 19 Oct – 18 Nov 2026' },
  { value: 'season', label: 'This season · 1 Oct – 31 Dec 2026' },
]

function BackfillPage() {
  const { state, actions, engineOn, loads, actor, can } = useRecognition()
  const publishedRules = useMemo(
    () =>
      state.rules
        .filter((rule) => rule.status === 'published')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.rules],
  )
  const [ruleKey, setRuleKey] = useState(publishedRules[0]?.ruleKey ?? '')
  const [windowValue, setWindowValue] = useState('last-30')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [detailBatch, setDetailBatch] = useState<BackfillBatch | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState<BackfillBatch | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  const batch = state.backfill.find((entry) => entry.id === activeBatchId) ?? null
  const rule = publishedRules.find((entry) => entry.ruleKey === ruleKey) ?? publishedRules[0]
  const windowLabel = WINDOWS.find((entry) => entry.value === windowValue)?.label ?? WINDOWS[0].label
  const included = batch?.rows.filter((row) => row.include) ?? []
  const includedXp = included.reduce((sum, row) => sum + row.xp, 0)
  const paramsSignature = `${ruleKey}|${windowValue}`
  const dryRunSignature = batch ? `${batch.ruleKey}|${batch.windowLabel.startsWith('This season') ? 'season' : 'last-30'}` : null
  const paramsChanged = Boolean(batch && dryRunSignature !== paramsSignature && batch.status === 'dry_run')

  if (loads.backfill === 'loading' && state.backfill.length === 0) {
    return (
      <AdminPage kicker="Recognition · Backfill" title="Backfill">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    )
  }

  const runDryRun = async () => {
    if (!rule) {
      setError('Choose a published rule version.')
      return
    }
    setRunning(true)
    setError(null)
    try {
      const created = await actions.dryRunBackfill(rule.ruleKey, windowLabel)
      setActiveBatchId(created.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not run the dry-run.')
    } finally {
      setRunning(false)
    }
  }

  const exportDiff = (target: BackfillBatch) => {
    const csv = toCsv(
      ['reader', 'event', 'xp', 'version_at_event', 'include'],
      target.rows.map((row) => [row.reader, row.event, row.xp, row.versionAtEvent, row.include ? 'yes' : 'no']),
    )
    downloadCsv(`${target.id}-diff.csv`, csv)
  }

  const approve = async (target: BackfillBatch) => {
    setDetailError(null)
    try {
      await actions.approveBackfill(target.id)
      setDetailBatch({ ...target, status: 'approved', approvedBy: actor.name, approvedAt: new Date().toISOString() })
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Could not approve the batch.')
    }
  }

  return (
    <AdminPage
      kicker="Recognition · Backfill"
      title="Backfill"
      sub="Additive only. Only published rule versions can backfill; parameters are frozen into a batch and no batch can remove an award."
      actions={<span className="text-xs font-semibold text-muted-foreground">Second approver required</span>}
    >
      <ScopeNote>
        A new policy applies only from its effective date. A backfill corrects missing awards for a policy that was
        already live — it never retrofits a policy that did not exist when the reader acted.
      </ScopeNote>

      {!engineOn ? (
        <Notice tone="red" title="The recognition engine is off.">
          Backfill and approval are disabled while awards are paused. The dry-run history stays readable.
        </Notice>
      ) : null}
      {error ? <Notice tone="red" title="Dry-run failed">{error}</Notice> : null}
      {paramsChanged ? (
        <Notice tone="gold" title="Parameters changed.">
          Run the dry-run again before requesting approval. The previous result no longer describes these inputs.
        </Notice>
      ) : null}

      <section className="rounded-lg border border-border bg-card">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rule (published only)</span>
            <select
              value={rule?.ruleKey ?? ''}
              onChange={(event) => { setRuleKey(event.target.value); setActiveBatchId(null) }}
              aria-label="Backfill rule"
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              {publishedRules.map((entry) => (
                <option key={entry.ruleKey} value={entry.ruleKey}>
                  {entry.name} · v{entry.version}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Window</span>
            <select
              value={windowValue}
              onChange={(event) => { setWindowValue(event.target.value); setActiveBatchId(null) }}
              aria-label="Backfill window"
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              {WINDOWS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </label>
        </div>
        <div className="border-t border-border px-4 py-3">
          <Button variant="secondary" onClick={runDryRun} disabled={running || !engineOn || !rule}>
            <Play className="h-4 w-4" weight="fill" /> {running ? 'Running…' : 'Run dry-run'}
          </Button>
        </div>
      </section>

      {batch ? (
        <section className="mt-4 rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <h2 className="font-sans text-base font-bold text-foreground">Dry-run {batch.id}</h2>
              <p className="text-xs text-muted-foreground">Parameters frozen at {formatDateTime(batch.createdAt)}</p>
            </div>
            <StatusPill status={batch.status} label={batch.status === 'dry_run' ? 'Not approved' : undefined} />
          </div>
          <div className="grid gap-3 border-b border-border px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Rule" value={`${batch.ruleKey} · v${batch.ruleVersion} (published)`} />
            <Detail label="Window" value={batch.windowLabel} />
            <Detail label="Scanned" value={`${formatNumber(batch.scanned)} ${batch.unit} · ${batch.rows.length} missing · 0 removals`} />
            <Detail label="Included" value={`${included.length} of ${batch.rows.length} · ${formatXp(includedXp)}`} />
            <Detail label="Run by" value={`${actor.name} · ${formatDateTime(batch.createdAt)}`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Awards this dry-run would create</caption>
              <thead>
                <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <th scope="col" className="px-4 py-2">Reader</th>
                  <th scope="col" className="px-4 py-2">Event</th>
                  <th scope="col" className="px-4 py-2 text-right">XP</th>
                  <th scope="col" className="px-4 py-2">Version at event</th>
                  <th scope="col" className="px-4 py-2 text-right">Include</th>
                </tr>
              </thead>
              <tbody>
                {batch.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">Reader {row.reader}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{row.event}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{row.xp}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.versionAtEvent}</td>
                    <td className="px-4 py-2 text-right">
                      <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={row.include}
                          disabled={batch.status !== 'dry_run'}
                          onChange={(event) => actions.setBackfillRowInclude(batch.id, row.id, event.target.checked)}
                          aria-label={`Include reader ${row.reader}`}
                        />
                        Include
                      </label>
                    </td>
                  </tr>
                ))}
                {batch.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No missing awards for this rule and window.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => exportDiff(batch)} disabled={batch.rows.length === 0}>
              <DownloadSimple className="h-4 w-4" weight="duotone" /> Export diff (CSV)
            </Button>
            {batch.status === 'dry_run' ? (
              <Can permission="recognition.backfill">
                <Button
                  size="sm"
                  disabled={!engineOn || included.length === 0 || paramsChanged}
                  onClick={() => {
                    actions.requestBackfill(batch.id)
                    setActiveBatchId(batch.id)
                  }}
                >
                  Request approval
                </Button>
              </Can>
            ) : batch.status === 'requested' ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setDetailError(null); setDetailBatch(batch) }}>
                  Approver view
                </Button>
                <Can permission="recognition.backfill">
                  <Button variant="ghost" size="sm" onClick={() => { setWithdrawError(null); setWithdrawing(batch) }}>
                    Withdraw request
                  </Button>
                </Can>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setDetailBatch(batch)}>View batch</Button>
            )}
            {paramsChanged ? <span className="self-center text-xs text-[var(--amber-deep)]">Re-run required.</span> : null}
          </div>
        </section>
      ) : null}

      <section className="mt-4 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-sans text-base font-bold text-foreground">Batch history</h2>
          <span className="text-xs text-muted-foreground">{state.backfill.length} batches</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">Backfill batches and their approvers</caption>
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="px-4 py-2">Batch</th>
                <th scope="col" className="px-4 py-2">Rule</th>
                <th scope="col" className="px-4 py-2 text-right">Rows</th>
                <th scope="col" className="px-4 py-2">Requested by</th>
                <th scope="col" className="px-4 py-2">Approver</th>
                <th scope="col" className="px-4 py-2">Status</th>
                <th scope="col" className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {state.backfill.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs font-semibold">{entry.id}</span>
                    <span className="block text-[11px] text-muted-foreground">{entry.windowLabel}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{entry.ruleKey} · v{entry.ruleVersion}</td>
                  <td className="px-4 py-2 text-right text-xs">{entry.rows.filter((row) => row.include).length || formatNumber(entry.scanned)}</td>
                  <td className="px-4 py-2 text-xs">{entry.requestedBy}</td>
                  <td className="px-4 py-2 text-xs">{entry.approvedBy ?? '—'}</td>
                  <td className="px-4 py-2"><StatusPill status={entry.status} /></td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => { setDetailError(null); setDetailBatch(entry) }}>
                      <ArrowSquareOut className="h-3.5 w-3.5" weight="duotone" /> Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Notice tone="gold" title="Additive only.">
        A dry-run is frozen into a batch. Approval adds the included rows; it never removes an award. The approver sees
        the same rows the requester saw, including exclusions.
      </Notice>

      <Dialog open={Boolean(detailBatch)} onOpenChange={(open) => { if (!open) setDetailBatch(null) }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detailBatch?.id} · approver view</DialogTitle>
            <DialogDescription>
              {detailBatch
                ? `${detailBatch.ruleKey} · v${detailBatch.ruleVersion} · requested by ${detailBatch.requestedBy}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {detailBatch ? (
            <div className="space-y-3">
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <Detail label="Window" value={detailBatch.windowLabel} />
                <Detail label="Rows" value={`${detailBatch.rows.filter((row) => row.include).length} included of ${detailBatch.rows.length}`} />
                <Detail label="XP" value={formatXp(detailBatch.rows.filter((row) => row.include).reduce((sum, row) => sum + row.xp, 0))} />
              </div>
              <div className="max-h-64 overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Rows the approver is approving</caption>
                  <thead>
                    <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-3 py-2">Reader</th>
                      <th scope="col" className="px-3 py-2">Event</th>
                      <th scope="col" className="px-3 py-2 text-right">XP</th>
                      <th scope="col" className="px-3 py-2">Include</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailBatch.rows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-3 py-2">Reader {row.reader}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.event}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{row.xp}</td>
                        <td className="px-3 py-2 text-xs">{row.include ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                    {detailBatch.rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-5 text-center text-sm text-muted-foreground">
                          This batch has no row-level diff in the sample (completed or no-op).
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {detailError ? <p role="alert" className="text-sm text-destructive">{detailError}</p> : null}
              {detailBatch.status === 'requested' && detailBatch.requestedBy === actor.id ? (
                <Notice tone="gold" title="A second approver must approve this batch.">
                  You requested it. Switch to another administrator to record the approval.
                </Notice>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            {detailBatch && detailBatch.status === 'requested' ? (
              <>
                <Can permission="recognition.backfill">
                  <Button
                    variant="ghost"
                    onClick={() => { setDetailBatch(null); if (detailBatch) { setWithdrawError(null); setWithdrawing(detailBatch) } }}
                  >
                    Withdraw
                  </Button>
                </Can>
                <Can permission="recognition.approve_backfill">
                  <Button
                    disabled={!engineOn || detailBatch.requestedBy === actor.id}
                    onClick={() => void approve(detailBatch)}
                  >
                    Approve batch
                  </Button>
                </Can>
              </>
            ) : null}
            <Button variant="outline" onClick={() => setDetailBatch(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={Boolean(withdrawing)}
        onOpenChange={(open) => { if (!open) setWithdrawing(null) }}
        title={withdrawing ? `Withdraw ${withdrawing.id}?` : 'Withdraw request'}
        description="The request leaves the approver queue. The frozen dry-run stays available for audit."
        confirmLabel="Withdraw request"
        danger
        minLength={10}
        error={withdrawError}
        onConfirm={(reason) => {
          if (!withdrawing) return
          try {
            actions.withdrawBackfill(withdrawing.id, reason)
            setWithdrawing(null)
            setDetailBatch(null)
          } catch (cause) {
            setWithdrawError(cause instanceof Error ? cause.message : 'Could not withdraw the request.')
          }
        }}
      />

      {!can('recognition.approve_backfill') ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Your role can request a backfill but not approve one. Approval needs a different administrator.
        </p>
      ) : null}
    </AdminPage>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  )
}
