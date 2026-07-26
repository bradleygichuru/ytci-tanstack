import { roles } from '#/lib/rbac'
import type { Role } from 'better-auth/plugins/access'

export type ResourceKey =
  | 'analytics' | 'destinations' | 'media' | 'lms'
  | 'conservation' | 'events' | 'aiConfig' | 'campaigns' | 'users'

export type Action = 'read' | 'create' | 'edit' | 'delete' | 'publish'

interface AuthSession {
  user: { role: string }
}

export function requirePermission(
  session: AuthSession | null,
  resource: ResourceKey,
  actions: Action[],
): asserts session is AuthSession {
  if (!session) {
    throw new Error('Unauthorized')
  }
  const roleMap = roles as Record<string, Role>
  const role = roleMap[session.user.role]
  if (!role) {
    throw new Error('Forbidden')
  }
  const result = role.authorize({ [resource]: actions })
  if (!result.success) {
    throw new Error('Forbidden')
  }
}
