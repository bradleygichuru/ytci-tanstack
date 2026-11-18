import { roles } from '#/lib/rbac'
import type { Role } from 'better-auth/plugins/access'

export type ResourceKey =
  | 'analytics' | 'destinations' | 'media' | 'lms'
  | 'conservation' | 'events' | 'aiConfig' | 'campaigns' | 'user' | 'challenges'
  | 'comments' | 'thenNow'

export type Action =
  | 'read' | 'create' | 'edit' | 'delete' | 'publish' | 'assign-role'
  | 'suspend-user' | 'update' | 'set-role' | 'ban' | 'get' | 'list'
  | 'submit' | 'review' | 'unpublish' | 'archive' | 'revoke'
  | 'manage_rights' | 'assign_reviewer' | 'override_separation'
  | 'manage_recognition' | 'hard_delete_draft'

export interface AuthSession {
  user: { role: string }
}

export function hasPermission(
  roleName: string | undefined,
  resource: ResourceKey,
  actions: Action[],
): boolean {
  if (!roleName) return false
  const roleMap = roles as Record<string, Role>
  const role = roleMap[roleName]
  if (!role) return false
  return role.authorize({ [resource]: actions }).success
}

export function requirePermission(
  session: AuthSession | null,
  resource: ResourceKey,
  actions: Action[],
): asserts session is AuthSession {
  if (!session) {
    throw new Error('Unauthorized')
  }
  if (!hasPermission(session.user.role, resource, actions)) {
    throw new Error('Forbidden')
  }
}
