import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowsClockwise, ShieldCheck, ShieldWarning, Trash } from '@phosphor-icons/react'
import type { ApiClient } from '#/lib/api'
import type {
  CompetitionEntry,
  ReviewCase,
  VoteSummary,
} from '#/lib/api/competition'
import { Button } from '#/components/ui/button'
import { FormInput } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import {
  Detail,
  EmptyRow,
  INPUT,
  LoadingRow,
  Panel,
  SectionHeading,
  Stat,
  TABLE_CELL,
  TABLE_HEAD,
  formatDateTime,
  titleCase,
} from './shared'

const REASON_CODES = [
  'self_vote',
  'team_vote',
  'judge_vote',
  'duplicate_account',
  'unverified_account',
  'device_abuse',
  'coordinated_abuse',
  'manual_review',
] as const

export function VotesTab({
  api,
  editionId,
  canEdit,
  canPublish,
}: {
  api: ApiClient
  editionId: string
  canEdit: boolean
  canPublish: boolean
}) {
  const [summary, setSummary] = useState<VoteSummary | null>(null)
  const [cases, setCases] = useState<ReviewCase[] | null>(null)
  const [entries, setEntries] = useState<CompetitionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState<'case' | 'resolve' | 'invalidate' | null>(null)
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(null)
  const [caseDraft, setCaseDraft] = useState({ entryId: '', signal: '' })
  const [resolveDraft, setResolveDraft] = useState({
    status: 'resolved' as 'resolved' | 'dismissed',
    resolution: '',
  })
  const [invalidateDraft, setInvalidateDraft] = useState({
    voteId: '',
    reasonCode: 'manual_review' as string,
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryResult, caseResult, entryResult] = await Promise.all([
        api.competition.votes.summary(editionId),
        api.competition.reviewCases.list(editionId),
        api.competition.entries.list(editionId),
      ])
      setSummary(summaryResult)
      setCases(caseResult.items)
      setEntries(entryResult.items)
    } catch {
      toast.error('Failed to load vote operations')
      setSummary(null)
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [api, editionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPanel(null)
    setSelectedCase(null)
  }, [editionId])

  const entryName = useCallback(
    (id: string | null) =>
      id ? (entries.find((entry) => entry.id === id)?.title ?? 'Entry') : 'Whole edition',
    [entries],
  )

  const openCase = async () => {
    if (!caseDraft.signal.trim()) {
      toast.error('Describe the signal that opened the case')
      return
    }
    setSaving(true)
    try {
      await api.competition.reviewCases.create(editionId, {
        entryId: caseDraft.entryId || null,
        signal: caseDraft.signal.trim(),
      })
      toast.success('Review case opened')
      setPanel(null)
      setCaseDraft({ entryId: '', signal: '' })
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open review case')
    } finally {
      setSaving(false)
    }
  }

  const resolve = async () => {
    if (!selectedCase) return
    if (resolveDraft.resolution.trim().length === 0) {
      toast.error('Add a written resolution')
      return
    }
    setSaving(true)
    try {
      await api.competition.reviewCases.resolve(
        selectedCase.id,
        resolveDraft.status,
        resolveDraft.resolution.trim(),
      )
      toast.success('Review case closed')
      setPanel(null)
      setSelectedCase(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve case')
    } finally {
      setSaving(false)
    }
  }

  const invalidate = async () => {
    if (!invalidateDraft.voteId.trim()) {
      toast.error('Enter the vote reference from the review investigation')
      return
    }
    setSaving(true)
    try {
      await api.competition.votes.invalidate(
        invalidateDraft.voteId.trim(),
        invalidateDraft.reasonCode,
      )
      toast.success('Vote invalidated. The ledger row is preserved.')
      setPanel(null)
      setInvalidateDraft({ voteId: '', reasonCode: 'manual_review' })
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invalidate vote')
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const open = (cases ?? []).filter(
      (item) => item.status !== 'resolved' && item.status !== 'dismissed',
    )
    return {
      live: summary?.liveVotes ?? 0,
      invalid: summary?.invalidVotes ?? 0,
      voters: summary?.distinctVoters ?? 0,
      open: open.length,
    }
  }, [cases, summary])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live votes" value={stats.live} icon={ShieldCheck} />
        <Stat label="Invalidated" value={stats.invalid} foot="Ledger rows kept" />
        <Stat label="Distinct voters" value={stats.voters} foot="Aggregate only" />
        <Stat label="Open cases" value={stats.open} foot="Manual review queue" />
      </div>

      <div className="rounded-lg border border-[var(--amber)]/40 bg-[var(--amber-bg)]/40 p-3 text-xs text-foreground">
        <span className="font-semibold">No automatic removal.</span> Votes are invalidated only by a
        reviewer, with a reason code. The ledger row stays, the recount recomputes totals, and the
        voter gets a generic notice with the appeal contact.
      </div>

      <SectionHeading
        title="Vote summary"
        description="Top-line totals per entry. Voter identity, email, IP, device, and per-vote timestamps stay out of every view."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <ArrowsClockwise className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 font-semibold">Entry</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Live</th>
                <th className="px-4 py-3 font-semibold">Invalidated</th>
                <th className="px-4 py-3 font-semibold">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <LoadingRow colSpan={5} label="Loading vote summary…" />
              ) : !summary || summary.entries.length === 0 ? (
                <EmptyRow colSpan={5}>No entries have votes in this edition.</EmptyRow>
              ) : (
                summary.entries.map((row) => {
                  const total = row.liveVotes + row.invalidVotes
                  return (
                    <tr key={row.entryId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {titleCase(row.categoryKey)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{row.liveVotes}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.invalidVotes}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {total === 0 ? '-' : `${Math.round((row.liveVotes / total) * 100)}% valid`}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SectionHeading
        title="Review cases"
        description="Open a case only when two independent signals agree. A reviewer closes it with a written resolution."
        actions={
          canEdit ? (
            <>
              {canPublish ? (
                <Button variant="outline" onClick={() => setPanel('invalidate')}>
                  <ShieldWarning /> Invalidate vote
                </Button>
              ) : null}
              <Button onClick={() => setPanel('case')}>Open review case</Button>
            </>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 font-semibold">Signal</th>
                <th className="px-4 py-3 font-semibold">Entry</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Opened</th>
                <th className="px-4 py-3 font-semibold">Resolution</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!cases ? (
                <LoadingRow colSpan={6} label="Loading review cases…" />
              ) : cases.length === 0 ? (
                <EmptyRow colSpan={6}>No vote review cases. The queue is clear.</EmptyRow>
              ) : (
                cases.map((item) => {
                  const closed = item.status === 'resolved' || item.status === 'dismissed'
                  return (
                    <tr key={item.id} className="align-top hover:bg-muted/30">
                      <td className={`${TABLE_CELL} text-xs`}>{item.signal}</td>
                      <td className={`${TABLE_CELL} text-xs`}>{entryName(item.entryId)}</td>
                      <td className={TABLE_CELL}>
                        <StatusBadge
                          status={closed ? item.status : 'pending'}
                          label={titleCase(item.status)}
                        />
                      </td>
                      <td className={`${TABLE_CELL} text-xs`}>{formatDateTime(item.openedAt)}</td>
                      <td className={`${TABLE_CELL} max-w-xs text-xs text-muted-foreground`}>
                        {item.resolution ?? '-'}
                      </td>
                      <td className={TABLE_CELL}>
                        {!closed && canEdit ? (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCase(item)
                                setResolveDraft({ status: 'resolved', resolution: '' })
                                setPanel('resolve')
                              }}
                            >
                              Resolve
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panel === 'case' ? (
        <Panel
          kicker="Vote integrity"
          title="Open a review case"
          description="Two independent signals are the threshold. Shared IP alone is accepted and is not a signal."
          onClose={() => setPanel(null)}
          footer={
            <>
              <Button onClick={() => void openCase()} disabled={saving}>
                {saving ? 'Opening…' : 'Open case'}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </>
          }
        >
          <div>
            <label
              htmlFor="case-entry"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Entry
            </label>
            <select
              id="case-entry"
              className={`${INPUT} mt-1`}
              value={caseDraft.entryId}
              onChange={(event) =>
                setCaseDraft((current) => ({ ...current, entryId: event.target.value }))
              }
            >
              <option value="">Whole edition</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="case-signal"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Signals
            </label>
            <textarea
              id="case-signal"
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={caseDraft.signal}
              onChange={(event) =>
                setCaseDraft((current) => ({ ...current, signal: event.target.value }))
              }
              placeholder="For example: device reuse cluster plus a pre-open account pattern."
            />
          </div>
          <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <Detail label="Vote caps" value="5 per category, 10 total" />
            <Detail label="Exclusions" value="Self, team, and judge votes" />
          </div>
        </Panel>
      ) : null}

      {panel === 'resolve' && selectedCase ? (
        <Panel
          kicker="Review decision"
          title="Close this review case"
          description="The decision records the reviewer, a written reason, and the resolution timestamp."
          onClose={() => setPanel(null)}
          footer={
            <>
              <Button onClick={() => void resolve()} disabled={saving}>
                {saving ? 'Saving…' : 'Save decision'}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </>
          }
        >
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold">{selectedCase.signal}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entryName(selectedCase.entryId)} · opened {formatDateTime(selectedCase.openedAt)}
            </p>
          </div>
          <div>
            <label
              htmlFor="case-status"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Outcome
            </label>
            <select
              id="case-status"
              className={`${INPUT} mt-1`}
              value={resolveDraft.status}
              onChange={(event) =>
                setResolveDraft((current) => ({
                  ...current,
                  status: event.target.value as 'resolved' | 'dismissed',
                }))
              }
            >
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="case-resolution"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Written resolution
            </label>
            <textarea
              id="case-resolution"
              rows={4}
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={resolveDraft.resolution}
              onChange={(event) =>
                setResolveDraft((current) => ({ ...current, resolution: event.target.value }))
              }
              placeholder="What was checked, what was decided, and why."
            />
          </div>
        </Panel>
      ) : null}

      {panel === 'invalidate' ? (
        <Panel
          kicker="Ledger correction"
          title="Invalidate a vote"
          description="This appends a reason-coded ledger row. It never deletes the vote, and it never runs automatically."
          onClose={() => setPanel(null)}
          footer={
            <>
              <Button variant="destructive" onClick={() => void invalidate()} disabled={saving}>
                <Trash /> {saving ? 'Invalidating…' : 'Invalidate vote'}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </>
          }
        >
          <FormInput
            label="Vote reference"
            required
            value={invalidateDraft.voteId}
            onChange={(value) =>
              setInvalidateDraft((current) => ({ ...current, voteId: value }))
            }
            description="The reference from the reviewed case. The admin API does not list voter identities."
          />
          <div>
            <label
              htmlFor="invalidate-reason"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Reason code
            </label>
            <select
              id="invalidate-reason"
              className={`${INPUT} mt-1`}
              value={invalidateDraft.reasonCode}
              onChange={(event) =>
                setInvalidateDraft((current) => ({ ...current, reasonCode: event.target.value }))
              }
            >
              {REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {titleCase(code)}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
            Notify the voter with the generic reason category and the appeal contact. Never include
            identity, device, or IP detail in the notice.
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
