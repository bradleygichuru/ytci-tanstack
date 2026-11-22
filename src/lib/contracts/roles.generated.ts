/**
 * GENERATED FILE — do not edit by hand.
 *
 * Source: openapi/roles.v1.yaml (ytci-go api/contracts/roles.v1.yaml)
 * Regenerate: bun run generate:roles
 *
 * The frozen canonical role model. Feature streams consume these helpers; they
 * must not add role names locally. Server enforcement remains authoritative —
 * this module only decides what the client may offer to show.
 */

export const ROLES_CONTRACT_VERSION = "1.0.0";

export const ROLE_KEYS = [
  "user",
  "county_officer",
  "content_editor",
  "species_expert",
  "translator",
  "language_reviewer",
  "rights_reviewer",
  "moderator",
  "organizer",
  "administrator",
  "super_admin",
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
  "user": { label: "Reader", scope: "reader", description: "Authenticated reader. Earns recognition, registers for events, saves species." },
  "county_officer": { label: "County officer", scope: "admin-read", description: "Legacy read-only county operations role." },
  "content_editor": { label: "Content editor", scope: "admin-write", description: "Prepares events, species base records, drafts and media uploads. Cannot publish." },
  "species_expert": { label: "Species expert", scope: "admin-write", description: "Owns taxonomy, conservation status, habitat, range and where-to-see evidence." },
  "translator": { label: "Translator", scope: "admin-write", description: "Human translation pinned to a source version. Cannot review their own work." },
  "language_reviewer": { label: "Language reviewer", scope: "admin-write", description: "Native or community review. Must differ from the translator of the same variant." },
  "rights_reviewer": { label: "Rights reviewer", scope: "admin-write", description: "Licences, attribution, narrator and community consent. Cannot upload the assets they review." },
  "moderator": { label: "Moderator", scope: "admin-read", description: "Read-only admin and moderation queue access. Cannot publish or award." },
  "organizer": { label: "Organizer", scope: "organizer", description: "Limited self-service for one or more organizer profiles. Scanner access requires organizer_staff." },
  "administrator": { label: "Administrator", scope: "admin-publish", description: "Publishes reviewed content, verifies organizers, moderates names and reports." },
  "super_admin": { label: "Super administrator", scope: "admin-full", description: "Revokes, retracts, disqualifies, decides appeals, flips kill switches." },
};

export type Permission =
  | "platform.contracts.read"
  | "platform.admin_access"
  | "platform.roles.read"
  | "platform.roles.manage"
  | "events.read"
  | "events.create"
  | "events.edit_draft"
  | "events.submit_review"
  | "events.publish"
  | "events.publish_paid"
  | "events.verify_organizer"
  | "events.revoke_organizer"
  | "events.view_registrations"
  | "events.scan"
  | "events.override_checkin"
  | "events.change_notice_draft"
  | "events.change_notice_approve"
  | "events.report_decide"
  | "recognition.read"
  | "recognition.author_rule"
  | "recognition.simulate_rule"
  | "recognition.publish_rule"
  | "recognition.author_badge"
  | "recognition.publish_badge"
  | "recognition.prepare_season"
  | "recognition.publish_season"
  | "recognition.close_season"
  | "recognition.moderate"
  | "recognition.disqualify"
  | "recognition.adjust_xp"
  | "recognition.approve_adjustment"
  | "recognition.backfill"
  | "recognition.approve_backfill"
  | "recognition.kill_switch"
  | "recognition.audit_read"
  | "species.read"
  | "species.create"
  | "species.edit_base"
  | "species.expert_review"
  | "species.translate"
  | "species.review_language"
  | "species.review_rights"
  | "species.upload_media"
  | "species.publish"
  | "species.unpublish"
  | "species.rights_withdraw"
  | "analytics.read"
  | "analytics.export"
  | "analytics.erasure"
  | "analytics.support_stream"
  | "then_now.read"
  | "then_now.author"
  | "then_now.review"
  | "then_now.publish"
  | "then_now.takedown"
  | "competition.read"
  | "competition.edit"
  | "competition.publish"
  | "competition.score";

export const PERMISSIONS = [
  "platform.contracts.read",
  "platform.admin_access",
  "platform.roles.read",
  "platform.roles.manage",
  "events.read",
  "events.create",
  "events.edit_draft",
  "events.submit_review",
  "events.publish",
  "events.publish_paid",
  "events.verify_organizer",
  "events.revoke_organizer",
  "events.view_registrations",
  "events.scan",
  "events.override_checkin",
  "events.change_notice_draft",
  "events.change_notice_approve",
  "events.report_decide",
  "recognition.read",
  "recognition.author_rule",
  "recognition.simulate_rule",
  "recognition.publish_rule",
  "recognition.author_badge",
  "recognition.publish_badge",
  "recognition.prepare_season",
  "recognition.publish_season",
  "recognition.close_season",
  "recognition.moderate",
  "recognition.disqualify",
  "recognition.adjust_xp",
  "recognition.approve_adjustment",
  "recognition.backfill",
  "recognition.approve_backfill",
  "recognition.kill_switch",
  "recognition.audit_read",
  "species.read",
  "species.create",
  "species.edit_base",
  "species.expert_review",
  "species.translate",
  "species.review_language",
  "species.review_rights",
  "species.upload_media",
  "species.publish",
  "species.unpublish",
  "species.rights_withdraw",
  "analytics.read",
  "analytics.export",
  "analytics.erasure",
  "analytics.support_stream",
  "then_now.read",
  "then_now.author",
  "then_now.review",
  "then_now.publish",
  "then_now.takedown",
  "competition.read",
  "competition.edit",
  "competition.publish",
  "competition.score",
] as const;

/** Roles granted each permission by the contract (before per-object scoping). */
export const PERMISSION_ROLES: Readonly<Record<Permission, readonly Role[]>> = {
  "platform.contracts.read": ["user", "county_officer", "content_editor", "species_expert", "translator", "language_reviewer", "rights_reviewer", "moderator", "organizer", "administrator", "super_admin"],
  "platform.admin_access": ["content_editor", "species_expert", "translator", "language_reviewer", "rights_reviewer", "moderator", "administrator", "super_admin"],
  "platform.roles.read": ["administrator", "super_admin"],
  "platform.roles.manage": ["super_admin"],
  "events.read": ["user", "county_officer", "content_editor", "moderator", "organizer", "administrator", "super_admin"],
  "events.create": ["content_editor", "organizer", "administrator", "super_admin"],
  "events.edit_draft": ["content_editor", "organizer", "administrator", "super_admin"],
  "events.submit_review": ["content_editor", "organizer"],
  "events.publish": ["administrator", "super_admin"],
  "events.publish_paid": ["administrator", "super_admin"],
  "events.verify_organizer": ["administrator", "super_admin"],
  "events.revoke_organizer": ["super_admin"],
  "events.view_registrations": ["organizer", "administrator", "super_admin"],
  "events.scan": ["organizer"],
  "events.override_checkin": ["organizer", "administrator", "super_admin"],
  "events.change_notice_draft": ["content_editor", "organizer", "administrator", "super_admin"],
  "events.change_notice_approve": ["administrator", "super_admin"],
  "events.report_decide": ["administrator", "super_admin"],
  "recognition.read": ["user", "content_editor", "moderator", "administrator", "super_admin"],
  "recognition.author_rule": ["content_editor", "administrator", "super_admin"],
  "recognition.simulate_rule": ["content_editor", "moderator", "administrator", "super_admin"],
  "recognition.publish_rule": ["administrator", "super_admin"],
  "recognition.author_badge": ["content_editor", "administrator", "super_admin"],
  "recognition.publish_badge": ["administrator", "super_admin"],
  "recognition.prepare_season": ["content_editor", "administrator", "super_admin"],
  "recognition.publish_season": ["administrator", "super_admin"],
  "recognition.close_season": ["administrator", "super_admin"],
  "recognition.moderate": ["moderator", "administrator", "super_admin"],
  "recognition.disqualify": ["super_admin"],
  "recognition.adjust_xp": ["administrator", "super_admin"],
  "recognition.approve_adjustment": ["super_admin"],
  "recognition.backfill": ["administrator", "super_admin"],
  "recognition.approve_backfill": ["super_admin"],
  "recognition.kill_switch": ["super_admin"],
  "recognition.audit_read": ["moderator", "administrator", "super_admin"],
  "species.read": ["user", "county_officer", "content_editor", "species_expert", "translator", "language_reviewer", "rights_reviewer", "moderator", "administrator", "super_admin"],
  "species.create": ["content_editor", "administrator", "super_admin"],
  "species.edit_base": ["content_editor", "species_expert", "administrator", "super_admin"],
  "species.expert_review": ["species_expert"],
  "species.translate": ["translator"],
  "species.review_language": ["language_reviewer"],
  "species.review_rights": ["rights_reviewer"],
  "species.upload_media": ["content_editor"],
  "species.publish": ["administrator", "super_admin"],
  "species.unpublish": ["administrator", "super_admin"],
  "species.rights_withdraw": ["super_admin"],
  "analytics.read": ["county_officer", "moderator", "administrator", "super_admin"],
  "analytics.export": ["administrator", "super_admin"],
  "analytics.erasure": ["administrator", "super_admin"],
  "analytics.support_stream": ["super_admin"],
  "then_now.read": ["moderator", "content_editor", "administrator", "super_admin"],
  "then_now.author": ["content_editor", "administrator", "super_admin"],
  "then_now.review": ["administrator", "super_admin"],
  "then_now.publish": ["administrator", "super_admin"],
  "then_now.takedown": ["super_admin"],
  "competition.read": ["county_officer", "moderator", "administrator", "super_admin"],
  "competition.edit": ["moderator", "administrator", "super_admin"],
  "competition.publish": ["moderator", "administrator", "super_admin"],
  "competition.score": ["user", "administrator", "super_admin"],
};

export interface DutyDefinition {
  readonly permissions: readonly Permission[];
  readonly roles: readonly Role[];
}

export const DUTIES: Readonly<Record<string, DutyDefinition>> = {
  "content_author": { permissions: ["events.create", "events.edit_draft", "species.create", "species.edit_base"], roles: ["content_editor"] },
  "media_uploader": { permissions: ["species.upload_media"], roles: ["content_editor"] },
  "translator": { permissions: ["species.translate"], roles: ["translator"] },
  "language_reviewer": { permissions: ["species.review_language"], roles: ["language_reviewer"] },
  "rights_reviewer": { permissions: ["species.review_rights"], roles: ["rights_reviewer"] },
  "recognition_author": { permissions: ["recognition.author_rule", "recognition.author_badge"], roles: ["content_editor", "administrator", "super_admin"] },
  "recognition_publisher": { permissions: ["recognition.publish_rule", "recognition.publish_badge"], roles: ["administrator", "super_admin"] },
  "competition_judge": { permissions: ["competition.score"], roles: ["user", "administrator", "super_admin"] },
  "organizer_requester": { permissions: ["events.submit_review"], roles: ["content_editor", "organizer"] },
  "organizer_verifier": { permissions: ["events.verify_organizer"], roles: ["administrator", "super_admin"] },
  "backfill_requester": { permissions: ["recognition.backfill"], roles: ["administrator", "super_admin"] },
  "backfill_approver": { permissions: ["recognition.approve_backfill"], roles: ["super_admin"] },
  "xp_adjuster": { permissions: ["recognition.adjust_xp"], roles: ["administrator", "super_admin"] },
  "xp_approver": { permissions: ["recognition.approve_adjustment"], roles: ["super_admin"] },
};

/** Per-object duties granted by assignment rows (for example organizer_staff). */
export const ASSIGNMENT_DUTIES: Readonly<
  Record<string, { permissions: readonly Permission[]; source: string }>
> = {
  "scanner": { permissions: ["events.scan"], source: "organizer_staff" },
};

export interface SeparationRule {
  readonly name: string;
  /**
   * Duty names that must not be held together (for example `translator` and
   * `language_reviewer`). Duties are permission bundles, not role names; a
   * role-level checker should resolve them through DUTIES.
   */
  readonly cannotHold: readonly string[];
  readonly rationale: string;
}

export const SEPARATIONS: readonly SeparationRule[] = [
  { name: "reviewer_is_not_translator", cannotHold: ["translator", "language_reviewer"], rationale: "A different native reviewer checks every translated variant (ADR 0014 §6)." },
  { name: "reviewer_is_not_uploader", cannotHold: ["media_uploader", "rights_reviewer"], rationale: "The rights reviewer must not review assets they uploaded (ADR 0013 §10)." },
];

export interface ActorSeparationRule {
  readonly name: string;
  readonly action: Permission;
  readonly priorAction: Permission;
  readonly rationale: string;
}

export const ACTOR_SEPARATIONS: readonly ActorSeparationRule[] = [
  { name: "publisher_is_not_author", action: "recognition.publish_rule", priorAction: "recognition.author_rule", rationale: "Reviewer is not publisher; no self-award (ADR 0010 §10, ADR 0015 §10)." },
  { name: "verifier_is_not_requester", action: "events.verify_organizer", priorAction: "events.submit_review", rationale: "Organizer verification requires a different reviewer (ADR 0012 §2)." },
  { name: "approver_is_not_requester", action: "recognition.approve_backfill", priorAction: "recognition.backfill", rationale: "Backfill needs a second approver (ADR 0010 §4)." },
  { name: "xp_approver_is_not_adjuster", action: "recognition.approve_adjustment", priorAction: "recognition.adjust_xp", rationale: "Manual adjustments need a second approver (ADR 0015 §7)." },
  { name: "language_reviewer_is_not_translator", action: "species.review_language", priorAction: "species.translate", rationale: "Translator and reviewer must differ (ADR 0014 §6)." },
  { name: "rights_reviewer_is_not_uploader", action: "species.review_rights", priorAction: "species.upload_media", rationale: "Rights reviewer must not review their own upload (ADR 0013 §10)." },
];
