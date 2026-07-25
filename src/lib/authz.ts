// STUB — convention contract only. Implementation lands in T10 (#11).
// See docs/authz/pattern.md for the full pattern.
import type { Role } from 'better-auth/plugins/access'

export type ResourceKey =
  | 'analytics' | 'destinations' | 'media' | 'lms'
  | 'conservation' | 'events' | 'aiConfig' | 'campaigns' | 'users'

export type Action = 'read' | 'create' | 'edit' | 'delete' | 'publish'

interface AuthSession {
  user: { role: string }
}

let roles: Record<string, Role> = {}

export function setRoles(r: Record<string, Role>) {
  roles = r
}

export function requirePermission(
  session: AuthSession | null,
  resource: ResourceKey,
  actions: Action[],
): asserts session is AuthSession {
  if (!session) {
    throw new Error('Unauthorized')
  }
  const role = roles[session.user.role]
  if (!role) {
    throw new Error('Forbidden')
  }
  const result = role.authorize({ [resource]: actions })
  if (!result.success) {
    throw new Error('Forbidden')
  }
}
