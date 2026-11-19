/**
 * Action- and route-level permission gating.
 *
 * `Can` is the only way a screen should hide an action. It reads the role the
 * server issued and the canonical permission from roles.v1.yaml, so an affordance
 * and the API agree on who may use it. Hiding is a courtesy, not enforcement:
 * the Go API still checks every write.
 */
import type { ReactNode } from 'react'
import { useContractRole } from '#/lib/contracts/session'
import { useFlags, type SurfaceFlag } from '#/lib/flags'
import { DataStateView } from '#/components/shell/DataState'
import type { Permission } from '#/lib/contracts/roles'

export interface CanProps {
  permission: Permission
  children: ReactNode
  /** Rendered when the role lacks the permission; defaults to nothing. */
  fallback?: ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = useContractRole()
  return <>{can(permission) ? children : fallback}</>
}

export interface SurfaceGateProps {
  flag: SurfaceFlag
  /** Optional canonical permission the surface requires. */
  permission?: Permission
  owner?: string
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Route-content gate for a new surface. Keeps the flag and permission checks in
 * one place so a deep link cannot render a surface the sidebar hides.
 */
export function SurfaceGate({ flag, permission, owner, children, fallback }: SurfaceGateProps) {
  const flags = useFlags()
  const { can } = useContractRole()

  if (!flags[flag] || (permission && !can(permission))) {
    return (
      fallback ?? (
        <DataStateView
          state="empty"
          title="This area isn't open yet"
          description={
            owner
              ? `The programme is still building this surface (${owner}). Check back soon.`
              : 'The programme is still building this surface. Check back soon.'
          }
        />
      )
    )
  }

  return <>{children}</>
}
