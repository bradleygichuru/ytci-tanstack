import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { repositoryEntries } from "./repository";

// ── Competition domain ──
//
// The competition edition is deliberately route-agnostic. The legal route is a
// client and legal gate (see docs/research/competition-legal-constraints.md):
//
//   prize_competition  licensed prize competition (Route A)
//   award_programme    non-competitive panel awards, grants and commissions
//                      (Route B, the current client choice)
//   licensed_operator  partner with a licensed promoter of record (Route C)
//
// Ages, dates, rules version and vote mode are configuration, never constants
// baked into the schema. Public copy is published by the public site, not here.
// `people_choice_only` is the first-class Route B mode: panel scores select the
// awards and public voting is a separate, non-cash recognition. `weighted` is
// retained for a future licensed route and is never the default.

const EDITION_STATUSES = [
  "draft",
  "consultation",
  "open",
  "judging",
  "voting",
  "closed",
  "published",
] as const;

const PROMOTION_TYPES = [
  "prize_competition",
  "award_programme",
  "licensed_operator",
] as const;

const PUBLIC_VOTE_MODES = ["weighted", "people_choice_only", "none"] as const;

const ELIGIBILITY_STATUSES = ["pending", "eligible", "ineligible"] as const;

const JUDGE_STATUSES = ["invited", "active", "recused", "inactive"] as const;

const ASSIGNMENT_STATUSES = ["assigned", "recused", "completed"] as const;

const AWARD_TYPES = ["category_winner", "overall", "people_choice"] as const;

export const competitionEditions = pgTable("competition_editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  theme: text("theme"),
  status: text("status", { enum: EDITION_STATUSES }).notNull().default("draft"),
  promotionType: text("promotion_type", { enum: PROMOTION_TYPES }).notNull().default("award_programme"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  publicVoteMode: text("public_vote_mode", { enum: PUBLIC_VOTE_MODES }).notNull().default("people_choice_only"),
  prizeEnabled: boolean("prize_enabled").notNull().default(false),
  rulesVersion: text("rules_version").notNull(),
  opensAt: timestamp("opens_at"),
  closesAt: timestamp("closes_at"),
  votingOpensAt: timestamp("voting_opens_at"),
  votingClosesAt: timestamp("voting_closes_at"),
  announcementAt: timestamp("announcement_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("competition_editions_slug_idx").on(table.slug),
  index("competition_editions_status_opens_idx").on(table.status, table.opensAt),
  check("competition_editions_status_check", sql`${table.status} in ('draft', 'consultation', 'open', 'judging', 'voting', 'closed', 'published')`),
  check("competition_editions_promotion_type_check", sql`${table.promotionType} in ('prize_competition', 'award_programme', 'licensed_operator')`),
  check("competition_editions_vote_mode_check", sql`${table.publicVoteMode} in ('weighted', 'people_choice_only', 'none')`),
  check("competition_editions_age_range_check", sql`${table.minAge} is null or ${table.maxAge} is null or ${table.minAge} <= ${table.maxAge}`),
  check("competition_editions_min_age_check", sql`${table.minAge} is null or ${table.minAge} >= 0`),
  check("competition_editions_max_age_check", sql`${table.maxAge} is null or ${table.maxAge} >= 0`),
  check("competition_editions_window_check", sql`${table.opensAt} is null or ${table.closesAt} is null or ${table.opensAt} <= ${table.closesAt}`),
  check("competition_editions_voting_window_check", sql`${table.votingOpensAt} is null or ${table.votingClosesAt} is null or ${table.votingOpensAt} <= ${table.votingClosesAt}`),
]);

export const competitionCategories = pgTable("competition_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").notNull().references(() => competitionEditions.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  uniqueIndex("competition_categories_edition_key_idx").on(table.editionId, table.key),
  index("competition_categories_edition_sort_idx").on(table.editionId, table.sortOrder),
]);

// One catalogue: entries link repository rows, they never copy them.
//
// Documented uniqueness rule: (edition_id, category_id, repository_entry_id) is
// unique, so the same work cannot be entered twice in one category. It may be
// entered in a second category, matching the rulebook limit of one entry per
// category and up to two categories per entrant or team. The category limit is
// enforced by the API because it depends on the entrant/team identity.
export const competitionEntries = pgTable("competition_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").notNull().references(() => competitionEditions.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => competitionCategories.id, { onDelete: "cascade" }),
  repositoryEntryId: uuid("repository_entry_id").notNull().references(() => repositoryEntries.id, { onDelete: "cascade" }),
  leadUserId: text("lead_user_id").references(() => users.id, { onDelete: "set null" }),
  teamName: text("team_name"),
  teamMembers: jsonb("team_members"),
  eligibilityStatus: text("eligibility_status", { enum: ELIGIBILITY_STATUSES }).notNull().default("pending"),
  eligibilityNote: text("eligibility_note"),
  guardianConsent: boolean("guardian_consent").default(false).notNull(),
  guardianConsentAt: timestamp("guardian_consent_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  withdrawnBy: text("withdrawn_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("competition_entries_edition_category_repository_active_idx").on(table.editionId, table.categoryId, table.repositoryEntryId).where(sql`withdrawn_at is null`),
  uniqueIndex("competition_entries_edition_category_lead_active_idx").on(table.editionId, table.categoryId, table.leadUserId).where(sql`withdrawn_at is null`),
  index("competition_entries_lead_edition_active_idx").on(table.leadUserId, table.editionId).where(sql`withdrawn_at is null`),
  index("competition_entries_edition_category_idx").on(table.editionId, table.categoryId),
  index("competition_entries_edition_eligibility_idx").on(table.editionId, table.eligibilityStatus),
  index("competition_entries_repository_idx").on(table.repositoryEntryId),
  check("competition_entries_eligibility_check", sql`${table.eligibilityStatus} in ('pending', 'eligible', 'ineligible')`),
]);

export const competitionJudges = pgTable("competition_judges", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").notNull().references(() => competitionEditions.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  email: text("email"),
  status: text("status", { enum: JUDGE_STATUSES }).notNull().default("invited"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("competition_judges_edition_idx").on(table.editionId, table.status),
  index("competition_judges_user_idx").on(table.userId),
  check("competition_judges_status_check", sql`${table.status} in ('invited', 'active', 'recused', 'inactive')`),
]);

export const competitionJudgeAssignments = pgTable("competition_judge_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").notNull().references(() => competitionEditions.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => competitionCategories.id, { onDelete: "cascade" }),
  judgeId: uuid("judge_id").notNull().references(() => competitionJudges.id, { onDelete: "cascade" }),
  status: text("status", { enum: ASSIGNMENT_STATUSES }).notNull().default("assigned"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("competition_judge_assignments_category_judge_idx").on(table.categoryId, table.judgeId),
  index("competition_judge_assignments_edition_idx").on(table.editionId, table.status),
  index("competition_judge_assignments_judge_idx").on(table.judgeId),
  check("competition_judge_assignments_status_check", sql`${table.status} in ('assigned', 'recused', 'completed')`),
]);

export const competitionConflicts = pgTable("competition_conflicts", {
  id: uuid("id").defaultRandom().primaryKey(),
  judgeId: uuid("judge_id").notNull().references(() => competitionJudges.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").notNull().references(() => competitionEntries.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  declaredAt: timestamp("declared_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("competition_conflicts_judge_entry_idx").on(table.judgeId, table.entryId),
  index("competition_conflicts_entry_idx").on(table.entryId),
]);

export const competitionScores = pgTable("competition_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignmentId: uuid("assignment_id").notNull().references(() => competitionJudgeAssignments.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").notNull().references(() => competitionEntries.id, { onDelete: "cascade" }),
  judgeId: uuid("judge_id").notNull().references(() => competitionJudges.id, { onDelete: "cascade" }),
  relevance: integer("relevance").notNull(),
  craft: integer("craft").notNull(),
  originality: integer("originality").notNull(),
  impact: integer("impact").notNull(),
  total: numeric("total", { precision: 6, scale: 2 }).notNull(),
  notes: text("notes"),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("competition_scores_assignment_entry_idx").on(table.assignmentId, table.entryId),
  index("competition_scores_entry_idx").on(table.entryId),
  index("competition_scores_judge_idx").on(table.judgeId),
  check("competition_scores_relevance_check", sql`${table.relevance} between 1 and 10`),
  check("competition_scores_craft_check", sql`${table.craft} between 1 and 10`),
  check("competition_scores_originality_check", sql`${table.originality} between 1 and 10`),
  check("competition_scores_impact_check", sql`${table.impact} between 1 and 10`),
  check("competition_scores_total_check", sql`${table.total} between 0 and 100`),
]);

// Votes are an append-only ledger at the API boundary. Rows are never deleted
// by a handler: invalidation stamps invalidated_at/invalidated_by/reason_code.
// Account deletion still removes a voter's rows through the user FK cascade, so
// the database cannot reject every DELETE without breaking erasure.
// One row per voter and entry.
export const competitionVotes = pgTable("competition_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").notNull().references(() => competitionEditions.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => competitionCategories.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").notNull().references(() => competitionEntries.id, { onDelete: "cascade" }),
  voterUserId: text("voter_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  invalidatedAt: timestamp("invalidated_at"),
  invalidatedBy: text("invalidated_by"),
  reasonCode: text("reason_code"),
}, (table) => [
  uniqueIndex("competition_votes_voter_entry_idx").on(table.voterUserId, table.entryId),
  uniqueIndex("competition_votes_idempotency_idx").on(table.idempotencyKey),
  index("competition_votes_counts_idx").on(table.editionId, table.categoryId, table.entryId),
  index("competition_votes_voter_edition_idx").on(table.voterUserId, table.editionId),
  index("competition_votes_entry_live_idx").on(table.entryId, table.invalidatedAt),
]);

export const competitionVoteReviewCases = pgTable("competition_vote_review_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").notNull().references(() => competitionEditions.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").references(() => competitionEntries.id, { onDelete: "set null" }),
  signal: text("signal").notNull(),
  status: text("status").notNull().default("open"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  reviewerId: text("reviewer_id"),
}, (table) => [
  index("competition_vote_review_cases_edition_status_idx").on(table.editionId, table.status),
  index("competition_vote_review_cases_entry_idx").on(table.entryId),
  check("competition_vote_review_cases_status_check", sql`${table.status} in ('open', 'reviewing', 'resolved', 'dismissed')`),
]);

export const competitionLeaderboardSnapshots = pgTable("competition_leaderboard_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").notNull().references(() => competitionEditions.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => competitionCategories.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  ledgerHash: text("ledger_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isFinal: boolean("is_final").notNull().default(false),
}, (table) => [
  index("competition_leaderboard_snapshots_edition_idx").on(table.editionId, table.categoryId, table.createdAt),
  index("competition_leaderboard_snapshots_final_idx").on(table.editionId, table.categoryId, table.isFinal),
]);

export const competitionAwards = pgTable("competition_awards", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").notNull().references(() => competitionEditions.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => competitionCategories.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").notNull().references(() => competitionEntries.id, { onDelete: "cascade" }),
  awardType: text("award_type", { enum: AWARD_TYPES }).notNull(),
  // Route B award forms. Additive to award_type so a category winner can carry
  // a grant, commission, certificate, feature or non-cash recognition. No money
  // moves inside the platform.
  awardForm: text("award_form"),
  citation: text("citation"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("competition_awards_edition_type_idx").on(table.editionId, table.awardType),
  index("competition_awards_entry_idx").on(table.entryId),
  check("competition_awards_type_check", sql`${table.awardType} in ('category_winner', 'overall', 'people_choice')`),
  check("competition_awards_form_check", sql`${table.awardForm} is null or ${table.awardForm} in ('grant', 'commission', 'certificate', 'feature', 'recognition')`),
]);

export const competitionConsultationResponses = pgTable("competition_consultation_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").references(() => competitionEditions.id, { onDelete: "set null" }),
  name: text("name"),
  email: text("email"),
  answers: jsonb("answers").notNull(),
  consent: boolean("consent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("competition_consultation_responses_edition_idx").on(table.editionId, table.createdAt),
]);
