/**
 * Canonical role helpers.
 *
 * The role list, permission grants, duties and separations come from the frozen
 * contract (`openapi/roles.v1.yaml` → `roles.generated.ts`). Nothing in the app
 * may invent a role name or a permission; add it to the contract in ytci-go
 * first, then regenerate with `bun run generate:roles`.
 *
 * Server enforcement is authoritative. These helpers exist so the client shows
 * the right entries and does not offer an action the server will reject.
 */
import {
  ACTOR_SEPARATIONS,
  ASSIGNMENT_DUTIES,
  DUTIES,
  PERMISSION_ROLES,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLE_KEYS,
  ROLES_CONTRACT_VERSION,
  SEPARATIONS,
  type ActorSeparationRule,
  type DutyDefinition,
  type Permission,
  type Role,
  type RoleDefinition,
  type RoleScope,
  type SeparationRule,
} from "#/lib/contracts/roles.generated";

export type {
  ActorSeparationRule,
  DutyDefinition,
  Permission,
  Role,
  RoleDefinition,
  RoleScope,
  SeparationRule,
};

export {
  ACTOR_SEPARATIONS,
  ASSIGNMENT_DUTIES,
  DUTIES,
  PERMISSION_ROLES,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLE_KEYS,
  ROLES_CONTRACT_VERSION,
  SEPARATIONS,
};

/** The role every authenticated account starts with. */
export const DEFAULT_ROLE: Role = "user";

const ROLE_SET: ReadonlySet<string> = new Set(ROLE_KEYS);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLE_SET.has(value);
}

/**
 * Coerces an untrusted value (session payload, storage, deep link) to a role.
 * Unknown values fall back to the least-privileged role rather than throwing, so
 * a stale token can never widen access.
 */
export function normaliseRole(value: unknown): Role {
  if (typeof value !== "string") return DEFAULT_ROLE;
  const candidate = value.trim().toLowerCase();
  return isRole(candidate) ? candidate : DEFAULT_ROLE;
}

export function roleDefinition(role: Role): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

/**
 * True when the contract grants `permission` to `role`.
 *
 * Per-object authority is not modelled here: `organizer` holds `events.scan`
 * only for organizers where an `organizer_staff` row assigns the scanner duty,
 * and reviewers may not act on their own submissions (see ACTOR_SEPARATIONS).
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const holders = PERMISSION_ROLES[permission];
  return holders ? holders.includes(role) : false;
}

export function roleCanAny(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => roleHasPermission(role, permission));
}

export function roleCanAll(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => roleHasPermission(role, permission));
}

export function permissionsForRole(role: Role): Permission[] {
  return PERMISSIONS.filter((permission) => roleHasPermission(role, permission));
}

/** Admin dashboard access is a permission, not a role comparison. */
export function canAccessAdmin(role: Role): boolean {
  return roleHasPermission(role, "platform.admin_access");
}

/** Publishers hold a publish permission; the role itself is never called "publisher". */
export function canPublish(role: Role): boolean {
  return roleCanAny(role, [
    "species.publish",
    "events.publish",
    "recognition.publish_rule",
    "recognition.publish_badge",
    "recognition.publish_season",
    "then_now.publish",
  ]);
}

/**
 * Duty separation for an actor about to perform `action` after `priorAction` on
 * the same object. Returns the violated rule, or null when the action is clean.
 */
export function findActorSeparationViolation(
  action: Permission,
  priorActions: readonly Permission[],
): ActorSeparationRule | null {
  return (
    ACTOR_SEPARATIONS.find(
      (rule) => rule.action === action && priorActions.includes(rule.priorAction),
    ) ?? null
  );
}
