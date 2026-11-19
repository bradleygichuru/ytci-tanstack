/**
 * MICE events operations layout.
 *
 * Gated by the same flag, canonical permission and admin requirement as the nav
 * registry entry. All screens share one store so the event scope, review queue
 * and local audit survive navigation.
 */
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { PageHeader } from '#/components/shell/PageHeader'
import { SurfaceGate } from '#/components/shell/Gates'
import { FixtureStateControl, StaleBanner } from '#/components/mice/shared'
import { MiceProvider } from '#/lib/mice/store'
import { hasContractPermission } from '#/lib/contracts/session'
import { canAccessAdmin, normaliseRole } from '#/lib/contracts/roles'
import { getFlags } from '#/lib/flags'
import { findNavItem } from '#/lib/navigation/sections'

export const Route = createFileRoute('/_authenticated/programme/events')({
  beforeLoad: ({ context }) => {
    const role = normaliseRole(context.user?.role)
    const item = findNavItem('/programme/events')
    if (
      !item ||
      (item.requiresAdmin && !canAccessAdmin(role)) ||
      (item.permission && !hasContractPermission(role, item.permission))
    ) {
      throw redirect({ to: '/no-access' })
    }
    if (item.flag && !getFlags()[item.flag]) {
      throw redirect({ to: '/programme' })
    }
  },
  component: MiceLayout,
})

const TABS = [
  { key: 'overview', label: 'Overview', to: '/programme/events' },
  { key: 'events', label: 'Events', to: '/programme/events/list' },
  { key: 'venues', label: 'Venues', to: '/programme/events/venues' },
  { key: 'agenda', label: 'Agenda & speakers', to: '/programme/events/agenda' },
  {
    key: 'registrations',
    label: 'Registrations',
    to: '/programme/events/registrations',
  },
  { key: 'check-in', label: 'Check-in', to: '/programme/events/check-in' },
  { key: 'review', label: 'Review queue', to: '/programme/events/review' },
  {
    key: 'organisers',
    label: 'Organiser verification',
    to: '/programme/events/organisers',
  },
  { key: 'reports', label: 'Event reports', to: '/programme/events/reports' },
  { key: 'audit', label: 'Audit log', to: '/programme/events/audit' },
] as const

function MiceLayout() {
  return (
    <MiceProvider>
      <SurfaceGate flag="mice" permission="events.read" owner="stream:mice">
        <MiceShell />
      </SurfaceGate>
    </MiceProvider>
  )
}

function MiceShell() {
  const location = useLocation()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Events operations"
        description="Author, review and run MICE events. Publishing is a separate reviewed step; the live listing is unchanged until a revision is approved."
        actions={<FixtureStateControl />}
      />
      <nav
        className="flex flex-wrap gap-1 border-b border-border pb-1"
        aria-label="Events operations sections"
      >
        {TABS.map((tab) => {
          const active =
            tab.to === '/programme/events'
              ? location.pathname === tab.to
              : location.pathname === tab.to ||
                location.pathname.startsWith(`${tab.to}/`)
          const editorActive =
            tab.key === 'events' &&
            /^\/programme\/events\/[0-9a-f-]{8,}/i.test(location.pathname)
          return (
            <Link
              key={tab.key}
              to={tab.to}
              className={`inline-flex min-h-9 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
                active || editorActive
                  ? 'border-[var(--amber)] text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              aria-current={active || editorActive ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      <StaleBanner />
      <Outlet />
    </div>
  )
}
