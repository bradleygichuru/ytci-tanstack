#!/usr/bin/env node
/**
 * Generates src/lib/contracts/roles.generated.ts from the frozen role contract.
 *
 * Source of truth: openapi/roles.v1.yaml (vendored from ytci-go
 * api/contracts/roles.v1.yaml at contract version 1.0.0). Never hand-edit the
 * generated file — `bun run generate:roles` rewrites it and a test fails when it
 * drifts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const SOURCE = resolve(repo, "openapi/roles.v1.yaml");
const outIndex = process.argv.indexOf("--out");
const TARGET =
  outIndex > -1 && process.argv[outIndex + 1]
    ? resolve(process.cwd(), process.argv[outIndex + 1])
    : resolve(repo, "src/lib/contracts/roles.generated.ts");

const spec = parse(readFileSync(SOURCE, "utf8"));

const q = (value) => JSON.stringify(value);
const list = (values, indent = 0) =>
  values.map((v) => `${" ".repeat(indent)}  ${q(v)},`).join("\n");

const roles = Object.entries(spec.roles).map(([key, value]) => ({
  key,
  label: value.label,
  scope: value.scope,
  description: value.description,
}));

const permissions = Object.entries(spec.permissions).map(([key, value]) => ({
  key,
  roles: value,
}));

const duties = Object.entries(spec.duties ?? {}).map(([key, value]) => ({
  key,
  permissions: value.permissions,
  roles: value.roles,
}));

const assignmentDuties = Object.entries(spec.assignment_duties ?? {}).map(
  ([key, value]) => ({ key, permissions: value.permissions, source: value.source }),
);

const separations = (spec.separations ?? []).map((s) => ({
  name: s.name,
  cannotHold: s.cannot_hold,
  rationale: s.rationale,
}));

const actorSeparations = (spec.actor_separations ?? []).map((s) => ({
  name: s.name,
  action: s.action,
  priorAction: s.prior_action,
  rationale: s.rationale,
}));

const out = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Source: openapi/roles.v1.yaml (ytci-go api/contracts/roles.v1.yaml)
 * Regenerate: bun run generate:roles
 *
 * The frozen canonical role model. Feature streams consume these helpers; they
 * must not add role names locally. Server enforcement remains authoritative —
 * this module only decides what the client may offer to show.
 */

export const ROLES_CONTRACT_VERSION = ${q(spec.version)};

export const ROLE_KEYS = [
${list(roles.map((r) => r.key))}
] as const;

export type Role = (typeof ROLE_KEYS)[number];

export type RoleScope =
  | "reader"
  | "admin-read"
  | "admin-write"
  | "admin-publish"
  | "admin-full"
  | "organizer";

export interface RoleDefinition {
  readonly label: string;
  readonly scope: RoleScope;
  readonly description: string;
}

export const ROLE_DEFINITIONS: Readonly<Record<Role, RoleDefinition>> = {
${roles
  .map(
    (r) =>
      `  ${q(r.key)}: { label: ${q(r.label)}, scope: ${q(r.scope)}, description: ${q(
        r.description,
      )} },`,
  )
  .join("\n")}
};

export type Permission =
${permissions.map((p) => `  | ${q(p.key)}`).join("\n")};

export const PERMISSIONS = [
${list(permissions.map((p) => p.key))}
] as const;

/** Roles granted each permission by the contract (before per-object scoping). */
export const PERMISSION_ROLES: Readonly<Record<Permission, readonly Role[]>> = {
${permissions
  .map((p) => `  ${q(p.key)}: [${p.roles.map((r) => q(r)).join(", ")}],`)
  .join("\n")}
};

export interface DutyDefinition {
  readonly permissions: readonly Permission[];
  readonly roles: readonly Role[];
}

export const DUTIES: Readonly<Record<string, DutyDefinition>> = {
${duties
  .map(
    (d) =>
      `  ${q(d.key)}: { permissions: [${d.permissions
        .map((p) => q(p))
        .join(", ")}], roles: [${d.roles.map((r) => q(r)).join(", ")}] },`,
  )
  .join("\n")}
};

/** Per-object duties granted by assignment rows (for example organizer_staff). */
export const ASSIGNMENT_DUTIES: Readonly<
  Record<string, { permissions: readonly Permission[]; source: string }>
> = {
${assignmentDuties
  .map(
    (d) =>
      `  ${q(d.key)}: { permissions: [${d.permissions
        .map((p) => q(p))
        .join(", ")}], source: ${q(d.source)} },`,
  )
  .join("\n")}
};

export interface SeparationRule {
  readonly name: string;
  /**
   * Duty names that must not be held together (for example \`translator\` and
   * \`language_reviewer\`). Duties are permission bundles, not role names; a
   * role-level checker should resolve them through DUTIES.
   */
  readonly cannotHold: readonly string[];
  readonly rationale: string;
}

export const SEPARATIONS: readonly SeparationRule[] = [
${separations
  .map(
    (s) =>
      `  { name: ${q(s.name)}, cannotHold: [${s.cannotHold
        .map((r) => q(r))
        .join(", ")}], rationale: ${q(s.rationale)} },`,
  )
  .join("\n")}
];

export interface ActorSeparationRule {
  readonly name: string;
  readonly action: Permission;
  readonly priorAction: Permission;
  readonly rationale: string;
}

export const ACTOR_SEPARATIONS: readonly ActorSeparationRule[] = [
${actorSeparations
  .map(
    (s) =>
      `  { name: ${q(s.name)}, action: ${q(s.action)}, priorAction: ${q(
        s.priorAction,
      )}, rationale: ${q(s.rationale)} },`,
  )
  .join("\n")}
];
`;

writeFileSync(TARGET, out);
process.stdout.write(`roles.generated.ts ← ${SOURCE}\n`);
