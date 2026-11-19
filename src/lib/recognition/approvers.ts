/**
 * Eligible second approvers for manual XP adjustments.
 *
 * The Go API verifies `X-Second-Approver` against `users`: the account must
 * exist, be active, differ from the caller, and hold
 * `recognition.approve_adjustment`. The client derives the same set from the
 * frozen role contract so an operator can only pick a value the server will
 * accept.
 */
import {
  PERMISSION_ROLES,
  isRole,
  roleHasPermission,
  type Role,
} from '#/lib/contracts/roles'

export const ADJUSTMENT_APPROVER_PERMISSION = 'recognition.approve_adjustment' as const

export interface ApproverDirectoryUser {
  id: string
  name: string
  email?: string | null
  role: string
  banned?: boolean | null
}

export interface AdjustmentApprover {
  id: string
  name: string
  email: string
  role: string
}

interface UsersListResponse {
  users?: ApproverDirectoryUser[]
}

/** Roles the frozen contract grants `recognition.approve_adjustment`. */
export function approverRoles(): readonly Role[] {
  return PERMISSION_ROLES[ADJUSTMENT_APPROVER_PERMISSION]
}

export function canApproveAdjustment(role: unknown): boolean {
  return isRole(role) && roleHasPermission(role, ADJUSTMENT_APPROVER_PERMISSION)
}

/**
 * Active users who may approve an adjustment, minus the signed-in actor.
 * De-duplicates accounts and keeps the picker order stable by name.
 */
export function eligibleApprovers(
  users: readonly ApproverDirectoryUser[],
  actorId: string
): AdjustmentApprover[] {
  const seen = new Set<string>()
  return users
    .filter((user) => {
      if (!user || user.banned) return false
      if (!user.id || user.id === actorId) return false
      if (!canApproveAdjustment(user.role)) return false
      if (seen.has(user.id)) return false
      seen.add(user.id)
      return true
    })
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email ?? '',
      role: user.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

/**
 * Reads the admin user directory once per approver role and filters it down to
 * the same eligibility the API enforces. The endpoint already accepts
 * `role`/`banned` filters, so this never loads unrelated roles.
 */
export async function fetchAdjustmentApprovers(options: {
  actorId: string
  fetch?: typeof fetch
  baseUrl?: string
}): Promise<AdjustmentApprover[]> {
  const doFetch = options.fetch ?? fetch
  const baseUrl = options.baseUrl ?? '/api/admin/users/list'
  const roles = approverRoles()

  const responses = await Promise.all(
    roles.map(async (role) => {
      const query = new URLSearchParams({
        role,
        banned: 'false',
        limit: '100',
      })
      const response = await doFetch(`${baseUrl}?${query.toString()}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        let detail = `HTTP ${response.status}`
        try {
          const body = (await response.json()) as { error?: unknown }
          if (typeof body?.error === 'string' && body.error.trim()) detail = body.error
        } catch {
          // Keep the status line when the endpoint does not return JSON.
        }
        throw new Error(`Could not load eligible approvers (${detail}).`)
      }
      return ((await response.json()) as UsersListResponse).users ?? []
    })
  )

  return eligibleApprovers(responses.flat(), options.actorId)
}
