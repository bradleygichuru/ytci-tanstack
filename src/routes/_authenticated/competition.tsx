import { createFileRoute, redirect } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowsClockwise, Info, Plus } from '@phosphor-icons/react'
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
  const [createRequest, setCreateRequest] = useState(0)

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

  const hasNoEditions = editions !== null && editions.length === 0

  /**
   * One action for the zero-edition paths. It moves to the Editions tab and
   * asks the tab to open its create panel, so the header button and the
   * empty-state CTA cannot drift apart.
   */
  const startFirstEdition = () => {
    if (search.tab !== 'editions') setTab('editions')
    setCreateRequest((value) => value + 1)
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
          createRequest={createRequest}
          onConsumeCreateRequest={() => setCreateRequest(0)}
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
            createRequest={createRequest}
            onConsumeCreateRequest={() => setCreateRequest(0)}
          />
        )
    }
  }

  const needsEdition = search.tab !== 'editions' && !selectedEdition

  return (
    <div className="mx-auto w-full max-w-[1400px] rounded-xl border border-[#e4dac7] bg-[#faf7f0] p-4 text-[#2b261c] sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-[#e4dac7] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7b6a4c]">
            YTCI Awards
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">YTCI Awards</h1>
            <span className="rounded-full border border-[#d4c8b2] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6d5e44]">
              Award programme
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-[#5f5544]">
            Run the edition cycle, panel judging, public vote review, and award publication. The
            panel selects awards. The public vote decides only the non-cash People&apos;s Choice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!canEdit ? <StatusBadge status="draft" label="Read only" /> : null}
          {canEdit && hasNoEditions ? (
            <Button onClick={startFirstEdition}>
              <Plus /> New edition
            </Button>
          ) : null}
          <Button
            variant={hasNoEditions ? 'ghost' : 'outline'}
            onClick={() => void refreshAll()}
            disabled={loading}
            title="Reload editions"
            className={hasNoEditions ? 'text-[#6d5e44] hover:bg-[#efe8d9]' : undefined}
          >
            <ArrowsClockwise className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-[#e4dac7] bg-[#fffdf8] p-3">
        <label
          htmlFor="competition-edition"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7b6a4c]"
        >
          Edition
        </label>
        <select
          id="competition-edition"
          className="h-9 min-w-56 rounded-md border border-[#d8cdb8] bg-white px-3 text-sm text-[#2b261c]"
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
            <span className="text-xs text-[#6d5e44]">
              Entries {formatDate(selectedEdition.opensAt)} to {formatDate(selectedEdition.closesAt)}
            </span>
            <span className="text-xs text-[#6d5e44]">
              {titleCase(selectedEdition.publicVoteMode)}
            </span>
          </>
        ) : null}
      </div>

      {/*
        Router-backed section navigation. These are views of one page, not a
        tab widget with hidden panels, so a labelled navigation list with
        aria-current is the honest, low-risk semantic. Disabled sections stay
        focusable and explain why with a title, rather than silently doing
        nothing.
      */}
      <nav aria-label="Competition sections" className="mt-5 border-b border-[#e4dac7]">
        <ul className="flex flex-wrap items-center gap-1">
          {TABS.map((tab) => {
            const isActive = search.tab === tab.key
            const disabled = !selectedEdition && editions !== null && tab.key !== 'editions'
            return (
              <li key={tab.key}>
                <button
                  type="button"
                  onClick={() => {
                    if (disabled) return
                    setTab(tab.key)
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  aria-disabled={disabled || undefined}
                  title={disabled ? 'Needs an edition' : undefined}
                  className={cn(
                    'border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive
                      ? 'border-[#154212] text-[#2b261c]'
                      : 'border-transparent text-[#7b6a4c] hover:text-[#2b261c]',
                    disabled &&
                      'cursor-not-allowed border-transparent text-[#a89a83] hover:text-[#a89a83]',
                  )}
                >
                  {tab.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-5">
        {loading && !editions ? (
          <CompetitionSkeleton />
        ) : needsEdition ? (
          <div className="rounded-lg border border-dashed border-[#d4c8b2] bg-[#fffdf8] p-10 text-center">
            <Info className="mx-auto size-8 text-[#a4926f]" weight="duotone" />
            <h2 className="mt-3 text-lg font-bold">No edition selected</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#5f5544]">
              Create the awards edition before configuring entries, judges, scoring, votes, or
              awards.
            </p>
            {canEdit ? (
              <Button className="mt-4" onClick={startFirstEdition}>
                Create the first edition
              </Button>
            ) : (
              <p className="mt-4 text-sm text-[#5f5544]">
                Ask an administrator to create the first edition.
              </p>
            )}
          </div>
        ) : (
          <div key={`${search.tab}-${reloadKey}`}>{renderTab()}</div>
        )}
      </div>
    </div>
  )
}
