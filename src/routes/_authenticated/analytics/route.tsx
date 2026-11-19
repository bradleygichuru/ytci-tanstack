/**
 * Analytics admin layout.
 *
 * The shared sidebar has one Analytics entry. This layout owns the surface's
 * internal section nav, the contract filter bar, the data-state switcher, the
 * rollup banners and the source footer. Section routes render the panels.
 */
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { canAccessAdmin, normaliseRole } from '#/lib/contracts/roles'
import { hasContractPermission } from '#/lib/contracts/session'
import { getFlags } from '#/lib/flags'
import { AnalyticsProvider } from '#/lib/analytics/store'
import { AnalyticsNav, ScenarioBanner, SourceFooter } from '#/components/analytics/shared'

export const Route = createFileRoute('/_authenticated/analytics')({
  beforeLoad: ({ context }) => {
    const role = normaliseRole(context.user?.role)
    if (!canAccessAdmin(role) || !hasContractPermission(role, 'analytics.read')) {
      throw redirect({ to: '/no-access' })
    }
    if (!getFlags().analytics) {
      throw redirect({ to: '/programme' })
    }
  },
  component: AnalyticsLayout,
})

function AnalyticsLayout() {
  return (
    <AnalyticsProvider>
      <div className="space-y-4">
        <AnalyticsNav />
        <ScenarioBanner />
        <Outlet />
        <SourceFooter />
      </div>
    </AnalyticsProvider>
  )
}
