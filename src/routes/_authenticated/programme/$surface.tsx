/**
 * Shell placeholder for a programme surface.
 *
 * This route exists so the nav entry is never a dead link while a stream is
 * building. It is gated by the same flag and canonical permission as the sidebar;
 * the owning stream replaces this component with its screens.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'
import { DataStateView } from '#/components/shell/DataState'
import { PageHeader } from '#/components/shell/PageHeader'
import { hasContractPermission } from '#/lib/contracts/session'
import { normaliseRole } from '#/lib/contracts/roles'
import { getFlags } from '#/lib/flags'
import { findNavItem } from '#/lib/navigation/sections'

export const Route = createFileRoute('/_authenticated/programme/$surface')({
  beforeLoad: ({ context, params }) => {
    const role = normaliseRole(context.user?.role)
    const item = findNavItem(`/programme/${params.surface}`)
    if (!item || (item.permission && !hasContractPermission(role, item.permission))) {
      throw redirect({ to: '/no-access' })
    }
    if (item.flag && !getFlags()[item.flag]) {
      throw redirect({ to: '/programme' })
    }
  },
  component: ProgrammeSurfacePage,
})

function ProgrammeSurfacePage() {
  const { surface } = Route.useParams()
  const item = findNavItem(`/programme/${surface}`)

  return (
    <div className="space-y-6">
      <PageHeader
        title={item?.label ?? 'Programme surface'}
        description="This surface is owned by a feature stream and is not built yet."
        owner={item?.owner}
      />
      <DataStateView
        state="empty"
        title="This area isn't open yet"
        description={`The programme is still building ${item?.label ?? 'this surface'}. The shell, flags, permissions and fixtures are ready for the owning stream.`}
      />
    </div>
  )
}
