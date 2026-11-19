/**
 * Species admin surface layout.
 *
 * Owns only the species routes and components. The shared shell supplies the
 * page chrome, tables, dialogs, gates and contract client; this layout adds the
 * species tabs, the data-state selector and the authoring store.
 */
import { createFileRoute, Link, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { ClockCounterClockwise, Flask, ShieldCheck, Translate, TreeStructure } from '@phosphor-icons/react'
import { SurfaceGate } from '#/components/shell/Gates'
import { useContractRole } from '#/lib/contracts/session'
import {
  canAccessAdmin,
  normaliseRole,
  roleCanAny,
} from '#/lib/contracts/roles'
import { hasContractPermission } from '#/lib/contracts/session'
import { getFlags } from '#/lib/flags'
import {
  contractsApi,
  FIXTURE_STATES,
  isStale,
  unwrap,
  type FixtureState,
} from '#/lib/contracts/client'
import { fetchAllSpecies } from '#/lib/species/api'
import { SpeciesProvider, useSpecies } from '#/lib/species/store'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_authenticated/programme/species')({
  beforeLoad: ({ context }) => {
    const role = normaliseRole(context.user?.role)
    /*
     * `platform.admin_access` is currently granted only to moderator,
     * administrator and super_admin, but content editors, translators, species
     * experts and reviewers are the people this surface exists for. The species
     * gate therefore also accepts a species write duty; the nav visibility fix
     * belongs to the shell/roles contract and is noted in the parity doc.
     */
    const hasSpeciesDuty = roleCanAny(role, [
      'species.create',
      'species.edit_base',
      'species.translate',
      'species.review_language',
      'species.review_rights',
      'species.publish',
    ])
    if (
      (!canAccessAdmin(role) && !hasSpeciesDuty) ||
      !hasContractPermission(role, 'species.read')
    ) {
      throw redirect({ to: '/no-access' })
    }
    if (!getFlags().species) {
      throw redirect({ to: '/programme' })
    }
  },
  loader: async ({ context }) => {
    try {
      await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ['species', 'catalogue', 'default'],
        queryFn: () => fetchAllSpecies(contractsApi),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ['species', 'review', 'default', 'all'],
        queryFn: async () => {
          const result = await contractsApi.GET('/v1/admin/species/review', {
            params: { query: { limit: 100 } },
          })
          return { items: unwrap(result).items ?? [], stale: isStale(result.response) }
        },
      }),
      context.queryClient.ensureQueryData({
        queryKey: ['species', 'sources', 'default'],
        queryFn: async () => {
          const result = await contractsApi.GET('/v1/admin/species/sources')
          return { items: unwrap(result).items ?? [], stale: isStale(result.response) }
        },
      }),
        context.queryClient.ensureQueryData({
          queryKey: ['species', 'rights', 'default'],
          queryFn: async () => {
            const result = await contractsApi.GET('/v1/admin/species/rights')
            return { items: unwrap(result).items ?? [], stale: isStale(result.response) }
          },
        }),
      ])
    } catch {
      // The screen renders the error state; a failed prefetch must not replace
      // the route with a framework error boundary.
    }
  },
  component: SpeciesLayout,
})

function SpeciesLayout() {
  return (
    <SurfaceGate flag="species" permission="species.read" owner="stream:species">
      <SpeciesProvider>
        <SpeciesShell />
      </SpeciesProvider>
    </SurfaceGate>
  )
}

const TABS = [
  { key: 'overview', to: '/programme/species', label: 'Overview' },
  { key: 'catalogue', to: '/programme/species/catalogue', label: 'Catalogue' },
  { key: 'translation', to: '/programme/species/translation', label: 'Translation queue' },
  { key: 'sources', to: '/programme/species/sources', label: 'Sources & rights' },
  { key: 'readiness', to: '/programme/species/readiness', label: 'Readiness' },
  { key: 'audit', to: '/programme/species/audit', label: 'Audit' },
] as const

const STATE_LABEL: Record<FixtureState, string> = {
  default: 'Default data',
  empty: 'Empty state',
  error: 'Error state',
  stale: 'Stale snapshot',
}

function SpeciesShell() {
  const { pathname } = useLocation()
  const {
    fixtureState,
    setFixtureState,
    actor,
    tasks,
    rows,
    reviewItems,
    loading,
    error,
    refetch,
  } = useSpecies()
  const { can } = useContractRole()
  const staleCount = tasks.filter((task) => task.state === 'stale').length

  const isActive = (key: string) => {
    if (key === 'overview') return pathname === '/programme/species'
    if (key === 'catalogue') {
      if (pathname.startsWith('/programme/species/catalogue')) return true
      if (!/^\/programme\/species\/[^/]+/.test(pathname)) return false
      return !['translation', 'sources', 'readiness', 'audit'].some((segment) =>
        pathname.startsWith(`/programme/species/${segment}`),
      )
    }
    return pathname.startsWith(`/programme/species/${key}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-1">
        <nav className="flex flex-wrap items-center gap-1" aria-label="Species admin sections">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              to={tab.to}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition-colors',
                isActive(tab.key)
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              aria-current={isActive(tab.key) ? 'page' : undefined}
            >
              {tab.key === 'translation' ? <Translate className="size-4" weight="duotone" /> : null}
              {tab.key === 'sources' ? <ShieldCheck className="size-4" weight="duotone" /> : null}
              {tab.key === 'readiness' ? <Flask className="size-4" weight="duotone" /> : null}
              {tab.key === 'audit' ? <ClockCounterClockwise className="size-4" weight="duotone" /> : null}
              {tab.label}
              {tab.key === 'translation' && staleCount > 0 ? (
                <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                  {staleCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
            title="The role comes from the signed-in session; the API enforces every write."
          >
            <TreeStructure className="size-3.5" weight="bold" />
            {actor.name} · {actor.roleLabel}
          </span>
          <label htmlFor="species-data-state" className="sr-only">
            Data state
          </label>
          <select
            id="species-data-state"
            value={fixtureState}
            onChange={(event) => setFixtureState(event.target.value as FixtureState)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
          >
            {FIXTURE_STATES.map((state) => (
              <option key={state} value={state}>
                {STATE_LABEL[state]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {fixtureState === 'stale' ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
          role="status"
        >
          <span className="font-semibold text-foreground">Stale snapshot.</span>
          <span>Writes are disabled; filters and exports still read the last known values.</span>
          <button
            type="button"
            className="ml-auto font-semibold text-primary underline underline-offset-2"
            onClick={() => setFixtureState('default')}
          >
            Use live data
          </button>
        </div>
      ) : null}

      {error && fixtureState !== 'error' ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          <span className="font-semibold">The species API returned an error.</span>
          <span>{(error as Error).message}</span>
          <button type="button" className="ml-auto font-semibold underline" onClick={refetch}>
            Retry
          </button>
        </div>
      ) : null}

      {loading && fixtureState === 'default' && rows.length === 0 && reviewItems.length === 0 ? (
        <p className="text-xs text-muted-foreground" role="status">
          Loading species records and review state…
        </p>
      ) : null}

      <Outlet />

      {!can('species.publish') ? (
        <p className="text-[11px] text-muted-foreground">
          Publish and unpublish stay hidden for your role. Content editing, translation and
          rights work are gated separately.
        </p>
      ) : null}
    </div>
  )
}
