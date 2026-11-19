import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle, Clock, Power, ShieldCheck, Warning } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { useRecognition } from '#/lib/recognition/store'
import { formatNumber, relativeAge } from '#/lib/recognition/format'
import { AdminPage, DataState, ScopeNote, StatCard } from '#/components/recognition/shared'
import { MODERATION_KIND_LABEL } from '#/lib/recognition/logic'

export const Route = createFileRoute('/_authenticated/recognition/')({
  component: RecognitionOverviewPage,
})

function RecognitionOverviewPage() {
  const { state, loads, actions, engineOn } = useRecognition()
  const loading = loads.rules === 'loading' || loads.badges === 'loading'
  const failed = loads.rules === 'error' && loads.badges === 'error' && loads.seasons === 'error'

  if (loading) {
    return (
      <AdminPage
        kicker="Recognition · Overview"
        title="Recognition overview"
        sub="Reading rules, badges, awards and board state."
      >
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    )
  }

  if (failed) {
    return (
      <AdminPage kicker="Recognition · Overview" title="Recognition overview">
        <DataState state="error" onRetry={() => actions.refresh()}>
          {null}
        </DataState>
      </AdminPage>
    )
  }

  const publishedRules = state.rules.filter((rule) => rule.status === 'published')
  const draftRules = state.rules.filter((rule) => rule.status === 'draft')
  const openAwards = state.awards.filter((award) => award.status === 'failed' || award.status === 'queued')
  const oldestOpen = openAwards.length
    ? new Date(Math.min(...openAwards.map((award) => new Date(award.at).getTime())))
    : null
  const delivered = state.awards.filter((award) => award.status === 'delivered')
  const suppressed = state.awards.filter((award) => award.status === 'suppressed')
  const openCases = state.moderation.filter(
    (entry) => entry.status !== 'decided' && entry.status !== 'closed'
  )
  const activeSeason = state.seasons.find((season) => season.status === 'active')
  const activeBoard = activeSeason ? state.boards[activeSeason.key] : undefined
  const activeRows = activeBoard?.rows.filter((row) => row.status === 'active') ?? []
  const publicSwitch = state.killSwitches.find((entry) => entry.key === 'public_leaderboard')

  const isEmpty = state.rules.length === 0 && state.badges.length === 0 && state.seasons.length === 0
  if (isEmpty) {
    return (
      <AdminPage kicker="Recognition · Overview" title="Recognition overview">
        <DataState
          state="empty"
          emptyTitle="No recognition records in this view"
          emptyDescription="The empty fixture removes rules, badges, seasons and the ledger. Reset to the sample to keep working."
          emptyAction={<Button onClick={actions.reset}>Reset sample data</Button>}
        >
          {null}
        </DataState>
      </AdminPage>
    )
  }

  const neverPublished = state.rules.filter(
    (rule) =>
      rule.status === 'draft' &&
      !state.rules.some((entry) => entry.ruleKey === rule.ruleKey && entry.status === 'published')
  )
  const failedGroups = state.awards.filter((award) => award.status === 'failed')

  return (
    <AdminPage
      kicker="Recognition · Overview"
      title="Recognition overview"
      sub="Operate the rules and rewards engine. Awards are server-authoritative; every override is audited."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/recognition/audit">Open audit</Link>
        </Button>
      }
    >
      <ScopeNote>
        {engineOn ? 'Engine on' : 'Engine off'} · {state.awards.length} sample awards ·{' '}
        {publishedRules.length} published rules
      </ScopeNote>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published rules"
          value={publishedRules.length}
          foot={`${draftRules.length + neverPublished.length} staged draft${draftRules.length + neverPublished.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Awards in ledger"
          value={state.awards.length}
          foot={`${delivered.length} delivered · ${openAwards.length} open · ${suppressed.length} suppressed`}
          accent={openAwards.length > 0 ? 'gold' : 'forest'}
        />
        <StatCard
          label="Badge catalogue"
          value={state.badges.length}
          foot={`${state.badges.filter((badge) => badge.status === 'published').length} published · ${state.badges.filter((badge) => badge.status === 'draft').length} draft`}
        />
        <StatCard
          label={activeSeason ? `Public board · ${activeSeason.nameEn}` : 'Public board'}
          value={activeBoard?.suppressed ? 'Suppressed' : formatNumber(activeRows.length)}
          foot={
            activeBoard?.suppressed
              ? 'Below the 10-person threshold'
              : `Opt-in adults · ${publicSwitch?.enabled ? 'visible' : 'hidden'}`
          }
          accent={activeBoard?.suppressed || !publicSwitch?.enabled ? 'gold' : 'forest'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-sans text-base font-bold text-foreground">Needs attention</h2>
            <span className="text-xs text-muted-foreground">Broken, then waiting, then informational</span>
          </div>

          <div className="divide-y divide-border">
            <AttentionGroup
              title="Broken"
              tone="broken"
              items={[
                failedGroups.length > 0
                  ? {
                      title: `${failedGroups.length} award${failedGroups.length === 1 ? '' : 's'} failed delivery`,
                      detail: oldestOpen
                        ? `Oldest ${relativeAge(oldestOpen)} · retries exhausted · still queued, not lost`
                        : 'Retries exhausted · still queued, not lost',
                      owner: 'System · outbox',
                      to: '/recognition/awards',
                      action: 'Open ledger',
                    }
                  : null,
                openCases.some((entry) => entry.kind === 'leaderboard_cheat')
                  ? {
                      title: 'Cheating report is waiting',
                      detail: 'Repeated QR scans · 48-hour triage target',
                      owner: 'Amina Hassan',
                      to: '/recognition/reports',
                      action: 'Review',
                    }
                  : null,
              ]}
            />
            <AttentionGroup
              title="Waiting"
              tone="waiting"
              items={[
                openCases.length > 0
                  ? {
                      title: `${openCases.length} name or report case${openCases.length === 1 ? '' : 's'}`,
                      detail: `${MODERATION_KIND_LABEL[openCases[0].kind] ?? openCases[0].kind} · ${relativeAge(openCases[0].createdAt)} · 48h target`,
                      owner: 'Amina Hassan',
                      to: '/recognition/reports',
                      action: 'Review',
                    }
                  : null,
                neverPublished.length > 0
                  ? {
                      title: neverPublished[0].name,
                      detail: `Draft v${neverPublished[0].version} · never published · needs simulation and a second approver`,
                      owner: 'Brian Otieno',
                      to: '/recognition/rules',
                      action: 'Open rules',
                    }
                  : null,
                activeSeason
                  ? {
                      title: `Season ${activeSeason.nameEn}`,
                      detail: `${activeRows.length} opted-in · ${activeBoard?.publicHidden ? 'board hidden' : 'board public'} · closes ${activeSeason.endsAt.slice(0, 10)}`,
                      owner: 'Amina Hassan',
                      to: '/recognition/seasons',
                      action: 'Open seasons',
                    }
                  : null,
              ]}
            />
            <AttentionGroup
              title="Informational"
              tone="info"
              items={[
                {
                  title: engineOn ? 'Award sources are active' : 'Recognition engine is off',
                  detail: engineOn
                    ? 'Event, heritage, audio and trail sources are enabled.'
                    : 'Reads continue; new awards and all writes are paused.',
                  owner: 'Programme',
                  to: '/recognition/kill-switches',
                  action: 'Kill switches',
                },
              ]}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">Kill switches</h2>
              <Link
                to="/recognition/kill-switches"
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Manage
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {state.killSwitches.map((entry) => (
                <li key={entry.key} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.blocks}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      entry.enabled
                        ? 'border-[var(--success-leaf)] bg-[var(--leaf-bg)] text-[var(--success-leaf)]'
                        : 'border-destructive bg-destructive/10 text-destructive dark:text-red-300'
                    }`}
                  >
                    <Power className="h-3 w-3" weight="bold" aria-hidden />
                    {entry.enabled ? 'On' : 'Off'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">Recent audit</h2>
              <Link
                to="/recognition/audit"
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                All
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {state.audit.slice(0, 3).map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <p className="text-xs font-semibold text-foreground">{entry.action}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{entry.entity}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {entry.actor} · {relativeAge(entry.at)}
                  </p>
                </li>
              ))}
              {state.audit.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No audit entries in this view.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <QuickLink
          to="/recognition/rules"
          title="Rules and version history"
          body="Stage a definition, simulate it over real events, then publish with a second approver."
          icon={<ShieldCheck className="h-5 w-5" weight="duotone" />}
        />
        <QuickLink
          to="/recognition/awards"
          title="Award delivery"
          body="Failures grouped by cause, retry with a preview, and correct with a support reference."
          icon={<Warning className="h-5 w-5" weight="duotone" />}
        />
        <QuickLink
          to="/recognition/leaderboard"
          title="Board integrity"
          body="Recompute ranks, suppress small boards, freeze placements and retract with a reason."
          icon={<CheckCircle className="h-5 w-5" weight="duotone" />}
        />
      </div>
    </AdminPage>
  )
}

type AttentionItem = {
  title: string
  detail: string
  owner: string
  to: string
  action: string
}

function AttentionGroup({
  title,
  tone,
  items,
}: {
  title: string
  tone: 'broken' | 'waiting' | 'info'
  items: (AttentionItem | null)[]
}) {
  const filtered = items.filter((item): item is AttentionItem => Boolean(item))
  const toneClass =
    tone === 'broken'
      ? 'text-destructive dark:text-red-300'
      : tone === 'waiting'
        ? 'text-[var(--amber-deep)]'
        : 'text-muted-foreground'
  return (
    <div className="px-4 py-3">
      <p
        className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${toneClass}`}
      >
        {tone === 'broken' ? (
          <Warning className="h-3.5 w-3.5" weight="bold" />
        ) : tone === 'waiting' ? (
          <Clock className="h-3.5 w-3.5" weight="bold" />
        ) : (
          <CheckCircle className="h-3.5 w-3.5" weight="bold" />
        )}
        {title}
      </p>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing in this group.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li
              key={`${title}-${item.title}`}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.owner}
                </p>
              </div>
              <Button variant="outline" size="xs" asChild>
                <Link to={item.to}>
                  {item.action} <ArrowRight className="h-3 w-3" weight="bold" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QuickLink({
  to,
  title,
  body,
  icon,
}: {
  to: string
  title: string
  body: string
  icon: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-bold text-foreground group-hover:text-primary">{title}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{body}</p>
      <span className="mt-2 inline-flex text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
        Open →
      </span>
    </Link>
  )
}
