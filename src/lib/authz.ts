import { roles } from "#/lib/rbac";
import type { Role } from "better-auth/plugins/access";

export type ResourceKey =
  | "analytics"
  | "destinations"
  | "media"
  | "lms"
  | "conservation"
  | "events"
  | "aiConfig"
  | "campaigns"
  | "user"
  | "challenges"
  | "comments"
  | "marketplace"
  | "thenNow"
  | "audioStories";

export type Action =
  | "read"
  | "create"
  | "edit"
  | "delete"
  | "publish"
  | "assign-role"
  | "suspend-user"
  | "update"
  | "set-role"
  | "ban"
  | "get"
  | "list"
  | "submit"
  | "review"
  | "unpublish"
  | "archive"
  | "revoke"
  | "manage_rights"
  | "assign_reviewer"
  | "override_separation"
  | "manage_recognition"
  | "hard_delete_draft";

export interface AuthSession {
  user: { role: string };
}

/**
 * Accepts either a role name (for navigation and fixture-backed screens) or a
 * session (for server functions). Keeping both call styles means the alerts,
 * marketplace, and Then & Now slices share one permission check.
 */
export function hasPermission(
  subject: string | AuthSession | null | undefined,
  resource: ResourceKey,
  actions: Action[],
): boolean {
  const roleName = typeof subject === "string" ? subject : subject?.user.role;
  if (!roleName) return false;
  const role = (roles as Record<string, Role>)[roleName];
  if (!role) return false;
  return role.authorize({ [resource]: actions }).success;
}

export function requirePermission(
  session: AuthSession | null,
  resource: ResourceKey,
  actions: Action[],
): asserts session is AuthSession {
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (!hasPermission(session, resource, actions)) {
    throw new Error("Forbidden");
  }
}
