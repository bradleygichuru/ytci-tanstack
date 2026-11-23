import { createFileRoute, redirect } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowsClockwise, Info } from '@phosphor-icons/react'
import { hasPermission, requirePermission } from '#/lib/authz'
import { useApi } from '#/lib/api/use-api'
import type { Edition } from '#/lib/api/competition'
import { Button } from '#/components/ui/button'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { CompetitionSkeleton } from '#/components/skeletons/competition-skeleton'
import { EditionsTab } from '#/components/competition/EditionsTab'
import { EntriesTab } from '#/components/competition/EntriesTab'
import { JudgesTab } from '#/components/competition/JudgesTab'
import { ScoringTab } from '#/components/competition/ScoringTab'
import { VotesTab } from '#/components/competition/VotesTab'
import { ResultsTab } from '#/components/competition/ResultsTab'
import { AwardsTab } from '#/components/competition/AwardsTab'
import { ConsultationTab } from '#/components/competition/ConsultationTab'
import { formatDate, titleCase } from '#/components/competition/shared'
import { cn } from '#/lib/utils'

const TABS = [
  { key: 'editions', label: 'Editions' },
  { key: 'entries', label: 'Entries' },
  { key: 'judges', label: 'Judges' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'votes', label: 'Votes' },
  { key: 'results', label: 'Results' },
  { key: 'awards', label: 'Awards' },
  { key: 'consultation', label: 'Consultation' },
] as const

type TabKey = (typeof TABS)[number]['key']

function isTabKey(value: unknown): value is TabKey {
  return typeof value === 'string' && TABS.some((tab) => tab.key === value)
}

export const Route = createFileRoute('/_authenticated/competition')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: isTabKey(search.tab) ? search.tab : ('editions' as TabKey),
    edition: typeof search.edition === 'string' && search.edition ? search.edition : undefined,
  }),
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'competition', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: CompetitionAdminPage,
})

function CompetitionAdminPage() {
  const api = useApi()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const context = Route.useRouteContext()
  const role = context.user?.role ?? ''
  const canEdit = hasPermission(role, 'competition', ['edit'])
  const canPublish = hasPermission(role, 'competition', ['publish'])

  const [editions, setEditions] = useState<Edition[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [awardsRefresh, setAwardsRefresh] = useState(0)

  const loadEditions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.competition.editions.list()
      setEditions(result.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load competition editions')
      setEditions([])
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void loadEditions()
  }, [loadEditions])

  useEffect(() => {
    if (!editions || editions.length === 0) return
    if (editions.some((edition) => edition.id === search.edition)) return
    void navigate({
      search: (current) => ({ ...current, edition: editions[0].id }),
      replace: true,
    })
  }, [editions, navigate, search.edition])

  const selectedEdition = useMemo(() => {
    if (!editions || editions.length === 0) return null
    return editions.find((edition) => edition.id === search.edition) ?? editions[0]
  }, [editions, search.edition])

  const refreshAll = async () => {
    setReloadKey((key) => key + 1)
    await loadEditions()
  }

  const setTab = (tab: TabKey) => {
    void navigate({ search: (current) => ({ ...current, tab }) })
  }

  const setEdition = (editionId: string) => {
    void navigate({ search: (current) => ({ ...current, edition: editionId }) })
  }

  const renderTab = () => {
    if (!selectedEdition) {
      if (search.tab !== 'editions') return null
      return (
        <EditionsTab
          api={api}
          editions={editions ?? []}
          loading={loading}
          selectedEditionId={null}
          onSelect={(id) => setEdition(id)}
          onReload={async (selectId) => {
            await loadEditions()
            if (selectId) setEdition(selectId)
          }}
          canEdit={canEdit}
          canPublish={canPublish}
        />
      )
    }
    const editionId = selectedEdition.id
    switch (search.tab) {
      case 'entries':
        return <EntriesTab api={api} editionId={editionId} canEdit={canEdit} />
      case 'judges':
        return (
          <JudgesTab api={api} editionId={editionId} canEdit={canEdit} canPublish={canPublish} />
        )
      case 'scoring':
        return (
          <ScoringTab api={api} editionId={editionId} canEdit={canEdit} canPublish={canPublish} />
        )
      case 'votes':
        return (
          <VotesTab api={api} editionId={editionId} canEdit={canEdit} canPublish={canPublish} />
        )
      case 'results':
        return (
          <ResultsTab
            api={api}
            editionId={editionId}
            canPublish={canPublish}
            onAwardsChanged={() => setAwardsRefresh((value) => value + 1)}
          />
        )
      case 'awards':
        return (
          <AwardsTab
            api={api}
            editionId={editionId}
            canEdit={canEdit}
            canPublish={canPublish}
            refreshKey={awardsRefresh}
          />
        )
      case 'consultation':
        return <ConsultationTab api={api} editionId={editionId} canPublish={canPublish} />
      default:
        return (
          <EditionsTab
            api={api}
            editions={editions ?? []}
            loading={loading}
            selectedEditionId={selectedEdition.id}
            onSelect={(id) => {
              setEdition(id)
            }}
            onReload={async (selectId) => {
              await loadEditions()
              if (selectId) setEdition(selectId)
            }}
            canEdit={canEdit}
            canPublish={canPublish}
          />
        )
    }
  }

  const needsEdition = search.tab !== 'editions' && !selectedEdition

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Programme · Award programme
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Competition</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Run the edition cycle, panel judging, public vote review, and award publication. The
            panel selects awards. The public vote decides only the non-cash People&apos;s Choice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!canEdit ? <StatusBadge status="draft" label="Read only" /> : null}
          <Button variant="outline" onClick={() => void refreshAll()} disabled={loading}>
            <ArrowsClockwise className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <label
          htmlFor="competition-edition"
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Edition
        </label>
        <select
          id="competition-edition"
          className="h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedEdition?.id ?? ''}
          onChange={(event) => setEdition(event.target.value)}
          disabled={!editions || editions.length === 0}
        >
          {!editions || editions.length === 0 ? (
            <option value="">No editions yet</option>
          ) : (
            editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.name}
              </option>
            ))
          )}
        </select>
        {selectedEdition ? (
          <>
            <StatusBadge
              status={selectedEdition.status}
              label={titleCase(selectedEdition.status)}
            />
            <span className="text-xs text-muted-foreground">
              Entries {formatDate(selectedEdition.opensAt)} to {formatDate(selectedEdition.closesAt)}
            </span>
            <span className="text-xs text-muted-foreground">
              {titleCase(selectedEdition.publicVoteMode)}
            </span>
          </>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            aria-current={search.tab === tab.key ? 'page' : undefined}
            className={cn(
              'border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
              search.tab === tab.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading && !editions ? (
          <CompetitionSkeleton />
        ) : needsEdition ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <Info className="mx-auto size-8 text-muted-foreground" weight="duotone" />
            <h2 className="mt-3 text-lg font-bold">No edition selected</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Create the competition edition before configuring entries, judges, scoring, votes, or
              awards.
            </p>
            <Button className="mt-4" onClick={() => setTab('editions')}>
              Set up the first edition
            </Button>
          </div>
        ) : (
          <div key={`${search.tab}-${reloadKey}`}>{renderTab()}</div>
        )}
      </div>
    </div>
  )
}
