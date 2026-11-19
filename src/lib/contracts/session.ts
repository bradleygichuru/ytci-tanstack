/**
 * Session role bootstrap for the admin app.
 *
 * The server issues the role; this module maps it onto the frozen contract and
 * exposes the permission checks shared by nav, routes and action buttons.
 */
import { useCallback, useMemo } from 'react'
import { authClient } from '#/lib/auth-client'
import {
  DEFAULT_ROLE,
  canAccessAdmin,
  normaliseRole,
  permissionsForRole,
  roleDefinition,
  roleHasPermission,
  type Permission,
  type Role,
  type RoleDefinition,
} from '#/lib/contracts/roles'

export interface ContractSession {
  role: Role
  definition: RoleDefinition
  isAuthenticated: boolean
  isLoading: boolean
  can: (permission: Permission) => boolean
  canAny: (permissions: readonly Permission[]) => boolean
  permissions: Permission[]
  canAccessAdmin: boolean
}

/** Pure resolver, used by tests and by the hook. */
export function resolveContractRole(user: { role?: unknown } | null | undefined): Role {
  if (!user) return DEFAULT_ROLE
  return normaliseRole(user.role)
}

export function useContractRole(): ContractSession {
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user as { role?: unknown } | undefined
  const role = useMemo(() => resolveContractRole(user), [user])

  const can = useCallback(
    (permission: Permission) => roleHasPermission(role, permission),
    [role],
  )

  return {
    role,
    definition: roleDefinition(role),
    isAuthenticated: Boolean(session?.user),
    isLoading: isPending,
    can,
    canAny: (permissions) => permissions.some((permission) => roleHasPermission(role, permission)),
    permissions: permissionsForRole(role),
    canAccessAdmin: canAccessAdmin(role),
  }
}

/**
 * Route-level guard. Mirrors the nav rule so a URL typed directly cannot show a
 * surface the sidebar hides.
 */
export function hasContractPermission(role: Role, permission: Permission): boolean {
  return roleHasPermission(role, permission)
}
