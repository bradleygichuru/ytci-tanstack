import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowClockwise, FirstAid, Warning } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Can } from '#/components/shell/Gates'
import { useRecognition } from '#/lib/recognition/store'
import { countLabel, formatTime, formatXp, relativeAge } from '#/lib/recognition/format'
import {
  awardInTab,
  awardStatusLabel,
  failureCopy,
  groupAwardFailures,
  type AwardTab,
} from '#/lib/recognition/logic'
import {
  AdminPage,
  DataState,
  Notice,
  ScopeNote,
  StatCard,
  StatusPill,
} from '#/components/recognition/shared'
import { CorrectionDialog, RetryPreviewDialog } from '#/components/recognition/dialogs'
import type { Award } from '#/lib/recognition/types'

export const Route = createFileRoute('/_authenticated/recognition/awards')({
  component: AwardsPage,
})

const TABS: { value: AwardTab; label: string }[] = [
  { value: 'open', label: 'Undelivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'queued', label: 'Awaiting outbox' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'suppressed', label: 'Suppressed' },
]

function AwardsPage() {
  const { state, actions, engineOn, loads, can } = useRecognition()
  const [tab, setTab] = useState<AwardTab>('open')
  const [search, setSearch] = useState('')
  const [ruleFilter, setRuleFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')
  const [retryOpen, setRetryOpen] = useState(false)
  const [correcting, setCorrecting] = useState<Award | null>(null)
  const [correctError, setCorrectError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const undelivered = state.awards.filter(
    (award) => award.status !== 'delivered' && award.status !== 'suppressed'
  )
  const failed = state.awards.filter((award) => award.status === 'failed')
  const suppressed = state.awards.filter((award) => award.status === 'suppressed')
  const delivered = state.awards.filter((award) => award.status === 'delivered')
  const rules = [...new Set(state.awards.map((award) => award.ruleKey))].sort()

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = Date.now()
    const hours = ageFilter === '1' ? 1 : ageFilter === '4' ? 4 : 0
    return state.awards.filter((award) => {
      if (!awardInTab(award, tab)) return false
      if (ruleFilter !== 'all' && award.ruleKey !== ruleFilter) return false
      if (query && !`${award.reader} ${award.event}`.toLowerCase().includes(query)) return false
      if (hours > 0 && alsoNewerThan(award, hours, now)) return false
      return true
    })
  }, [state.awards, tab, search, ruleFilter, ageFilter])

  const groups = useMemo(() => groupAwardFailures(filtered), [filtered])
  const scopeIds = groups.flatMap((group) => group.awards.map((award) => award.id))

  const retry = (ids: string[]) => {
    actions.retryAwards(ids)
    setRetryOpen(false)
    setNotice(`${ids.length} award${ids.length === 1 ? '' : 's'} re-driven. XP was not duplicated.`)
  }

  if (loads.audit === 'loading' && state.awards.length === 0) {
    return (
      <AdminPage kicker="Recognition · Awards" title="Awards ledger">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    )
  }

  return (
    <AdminPage
      kicker="Recognition · Awards"
      title="Awards ledger"
      sub="Every award the engine writes, with delivery status. Failed awards stay queued; XP is never silently dropped."
      actions={
        <Can permission="recognition.adjust_xp">
          <Button
            variant="outline"
            size="sm"
            disabled={failed.length === 0 || !engineOn}
            onClick={() => setRetryOpen(true)}
          >
            <ArrowClockwise className="h-4 w-4" weight="bold" /> Retry failed ({failed.length})
          </Button>
        </Can>
      }
    >
      <ScopeNote>
        Version is the rule version at event time. Retrying never creates a second award: the award key is
        rule + reader + event.
      </ScopeNote>

      {!engineOn ? (
        <Notice tone="red" title="The recognition engine is off.">
          Retries are disabled; existing failures stay queued. Reads and corrections stay available.
        </Notice>
      ) : null}
      {notice ? (
        <Notice tone="green" title="Done">
          {notice}
        </Notice>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awards in ledger"
          value={state.awards.length}
          foot={`${delivered.length} delivered · 842/day in production`}
        />
        <StatCard
          label="Undelivered"
          value={undelivered.length}
          foot={undelivered.length ? 'Oldest stays queued, not lost' : 'None open'}
          accent={undelivered.length ? 'gold' : 'forest'}
        />
        <StatCard
          label="Suppressed"
          value={suppressed.length}
          foot="Duplicate scans and caps · no award"
          accent="none"
        />
        <StatCard
          label="Failed groups"
          value={groupAwardFailures(state.awards).length}
          foot="Cause explained once per group"
          accent={failed.length ? 'danger' : 'none'}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Award delivery state">
          {TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-pressed={tab === entry.value}
              onClick={() => setTab(entry.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                tab === entry.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reader or event"
          aria-label="Search awards"
          className="h-9 w-full sm:w-56"
        />
        <select
          value={ruleFilter}
          onChange={(event) => setRuleFilter(event.target.value)}
          aria-label="Filter by rule"
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          <option value="all">All rules</option>
          {rules.map((rule) => (
            <option key={rule} value={rule}>
              {rule}
            </option>
          ))}
        </select>
        <select
          value={ageFilter}
          onChange={(event) => setAgeFilter(event.target.value)}
          aria-label="Filter by age"
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          <option value="all">Any age</option>
          <option value="1">Older than 1h</option>
          <option value="4">Older than 4h</option>
        </select>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">{filtered.length} shown</span>
      </div>

      {tab === 'failed' || (tab === 'open' && failed.length > 0) ? (
        <div className="mb-4 grid gap-2 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.cause} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">{group.label}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {group.count} award{group.count === 1 ? '' : 's'} · {formatXp(group.xp)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{group.explanation}</p>
              <p className="mt-1 text-xs font-medium text-foreground">{group.action}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {group.ruleVersions.join(' · ')}
              </p>
              {engineOn ? (
                <Can permission="recognition.adjust_xp">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="mt-2"
                    onClick={() => retry(group.awards.map((award) => award.id))}
                  >
                    Retry this group
                  </Button>
                </Can>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <caption className="sr-only">Awards with delivery status and available action</caption>
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="px-3 py-3">
                  Reader
                </th>
                <th scope="col" className="px-3 py-3">
                  Rule
                </th>
                <th scope="col" className="px-3 py-3">
                  Version
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  XP
                </th>
                <th scope="col" className="px-3 py-3">
                  {tab === 'delivered' ? 'Event' : 'Reason / event'}
                </th>
                <th scope="col" className="px-3 py-3">
                  Attempted
                </th>
                <th scope="col" className="px-3 py-3">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((award) => {
                const copy = failureCopy(award.cause)
                return (
                  <tr key={award.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                    <td className="px-3 py-3 font-medium">{award.reader}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{award.ruleKey}</td>
                    <td className="px-3 py-3 font-mono text-xs">v{award.ruleVersion}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{award.xp}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {award.status === 'delivered'
                        ? award.event
                        : award.status === 'suppressed'
                          ? copy.label
                          : award.event}
                      {award.corrected ? (
                        <span className="mt-1 block font-semibold text-[var(--amber-deep)]">
                          {award.corrected.action === 'reversal' ? 'reversed' : 'credited manually'} ·{' '}
                          {award.corrected.supportRef}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {formatTime(award.at)}
                      <span className="block text-[10px]">
                        {award.attempts} attempt
                        {award.attempts === 1 ? '' : 's'} · {relativeAge(award.at)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={award.status} label={awardStatusLabel(award.status)} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      {award.status === 'delivered' ? (
                        <span className="text-xs text-muted-foreground">
                          {award.corrected ? 'Corrected' : 'Credited'}
                        </span>
                      ) : award.status === 'suppressed' ? (
                        <span className="text-xs text-muted-foreground">No award</span>
                      ) : award.status === 'queued' ? (
                        <span className="text-xs text-muted-foreground">Awaiting outbox</span>
                      ) : (
                        <Can permission="recognition.adjust_xp">
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={!engineOn}
                            onClick={() => retry([award.id])}
                          >
                            Retry
                          </Button>
                        </Can>
                      )}
                      {award.status !== 'suppressed' ? (
                        <Can permission="recognition.adjust_xp">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setCorrectError(null)
                              setCorrecting(award)
                            }}
                          >
                            <FirstAid className="h-3.5 w-3.5" weight="duotone" /> Correct
                          </Button>
                        </Can>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {tab === 'delivered'
                      ? 'No deliveries in this view. Delivered awards appear once the outbox confirms the write.'
                      : tab === 'suppressed'
                        ? 'No suppressed awards in this view. Duplicate scans and caps show here.'
                        : 'Every open failure has been queued or delivered.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Showing {filtered.length} in this view · {countLabel(state.awards.length, 'award')} · 842/day in production
        </div>
      </div>

      <Notice tone="green" title="Retrying is not a second award.">
        The award key is rule + reader + event. Manual credit records a support reference and is labelled in
        the audit log; a reversal adds a negative entry and keeps the original row.
      </Notice>

      <RetryPreviewDialog open={retryOpen} onOpenChange={setRetryOpen} groups={groups} onConfirm={retry} />

      <CorrectionDialog
        open={Boolean(correcting)}
        onOpenChange={(open) => {
          if (!open) setCorrecting(null)
        }}
        award={correcting}
        pending={pending}
        error={correctError}
        onSubmit={async (input) => {
          if (!correcting) return
          setPending(true)
          setCorrectError(null)
          try {
            await actions.correctAward(correcting.id, input)
            setCorrecting(null)
            setNotice('Correction recorded. A second approver flag is written to the audit entry.')
          } catch (cause) {
            setCorrectError(cause instanceof Error ? cause.message : 'Could not record the correction.')
          } finally {
            setPending(false)
          }
        }}
      />

      {!can('recognition.adjust_xp') ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Warning className="h-3.5 w-3.5" weight="duotone" /> Your role can read the ledger but not retry or
          correct awards.
        </p>
      ) : null}
      <p className="mt-1 text-[11px] text-muted-foreground">
        Scope {scopeIds.length} awards · rollout guards still apply server-side.
      </p>
    </AdminPage>
  )
}

function alsoNewerThan(award: Award, hours: number, now: number): boolean {
  const age = (now - new Date(award.at).getTime()) / 3_600_000
  return age <= hours
}
