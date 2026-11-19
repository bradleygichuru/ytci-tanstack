import { createFileRoute, Link, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { Lock } from '@phosphor-icons/react'
import { requirePermission } from '#/lib/authz'
import { ThenNowProvider, useThenNow } from '#/lib/then-now/store'
import {
  ErrorState,
  FixtureStateControl,
  Kicker,
  ScenarioBanner,
  SkeletonTable,
} from '#/components/then-now/shared'
import { StatusBadge } from '#/components/shared/StatusBadge'

export const Route = createFileRoute('/_authenticated/then-now')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'thenNow', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: ThenNowLayout,
})

function ThenNowLayout() {
  return (
    <ThenNowProvider>
      <ThenNowShell />
    </ThenNowProvider>
  )
}

function ThenNowShell() {
  const { state, scenario, source, apiStatus, apiError, setScenario, can } = useThenNow()
  const location = useLocation()
  const pathname = location.pathname
  const reviewCount = Object.values(state.experiences).filter((exp) => exp.draftStatus === 'in_review').length
  const canReview = can('review')
  const loading = scenario === 'loading' || apiStatus === 'loading'

  const tab = (active: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition-colors ${
      active
        ? 'border-[var(--amber)] text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  return (
    <div className="space-y-4" style={{ wordSpacing: '0.04em' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-1">
        <nav className="flex flex-wrap items-center gap-1" aria-label="Then & Now sections">
          <Link to="/then-now" className={tab(pathname === '/then-now' || pathname.startsWith('/then-now/sites'))}>
            Sites
          </Link>
          <Link to="/then-now/experiences" className={tab(pathname.startsWith('/then-now/experiences'))}>
            Experiences
          </Link>
          {canReview ? (
            <Link to="/then-now/review" className={tab(pathname.startsWith('/then-now/review'))}>
              Review
              {reviewCount > 0 && (
                <span className="rounded-full bg-[var(--amber)] px-1.5 py-0.5 text-[10px] font-bold text-primary">{reviewCount}</span>
              )}
            </Link>
          ) : (
            <span className="inline-flex min-h-9 cursor-not-allowed items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground/50">
              <Lock className="h-3.5 w-3.5" weight="bold" /> Review
            </span>
          )}
          <span className="inline-flex min-h-9 cursor-not-allowed items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground/40">
            <Lock className="h-3.5 w-3.5" weight="bold" /> Trails
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Post-v1</span>
          </span>
          <span className="inline-flex min-h-9 cursor-not-allowed items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground/40">
            <Lock className="h-3.5 w-3.5" weight="bold" /> Recognition
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Post-v1</span>
          </span>
        </nav>
        <FixtureStateControl />
      </div>

      <ScenarioBanner />

      {loading ? (
        <div>
          <Kicker>Then &amp; Now</Kicker>
          <h1 className="mt-1 font-sans text-3xl font-bold tracking-tight text-foreground">Loading…</h1>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Fetching the latest sites, experiences, and review state.</p>
          <SkeletonTable rows={6} cols={5} />
        </div>
      ) : scenario === 'error' ? (
        <div>
          <Kicker>Then &amp; Now</Kicker>
          <h1 className="mt-1 font-sans text-3xl font-bold tracking-tight text-foreground">Experiences</h1>
          <div className="mt-4">
            <ErrorState onRetry={() => setScenario('default')} />
          </div>
        </div>
      ) : (
        <Outlet />
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-muted-foreground">
        <StatusBadge
          status={source === 'api' ? 'published' : 'draft'}
          label={source === 'api' ? 'Live API' : 'Fixture data'}
        />
        <span>
          {source === 'api'
            ? 'Then & Now admin is reading and writing sites, experiences, review decisions, and audit through the Go API.'
            : apiError
              ? `Then & Now admin is running against local fixtures. The API read failed: ${apiError}`
              : 'Then & Now admin is running against local fixtures because the Go API is unavailable or has no sites yet. Writes stay in this browser.'}
        </span>
      </div>
    </div>
  )
}
