import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  index,
  uniqueIndex,
  customType,
  check,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { mediaAssets } from "./business";

// Generated full-text search column. Drizzle treats it as a read-only string;
// Postgres computes it from title/summary/body_md/tags (see migration 0036).
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const REPOSITORY_KINDS = [
  "competition_entry",
  "innovation",
  "conservation_resource",
  "experience",
] as const;

const REPOSITORY_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "published",
  "rejected",
  "archived",
] as const;

// ── Repository Entries ──
// One catalogue row per public item, discriminated by `kind`. Contact fields
// (author_email, author_phone) are admin-only and never appear in public DTOs.
export const repositoryEntries = pgTable("repository_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind", { enum: REPOSITORY_KINDS }).notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  bodyMd: text("body_md").notNull().default(""),
  county: text("county"),
  category: text("category"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  authorName: text("author_name"),
  authorEmail: text("author_email"),
  authorUserId: text("author_user_id").references(() => users.id, { onDelete: "set null" }),
  authorPhone: text("author_phone"),
  authorAgeBand: text("author_age_band"),
  authorOrg: text("author_org"),
  teamMembers: jsonb("team_members"),
  competitionName: text("competition_name"),
  competitionCategory: text("competition_category"),
  coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  documentMediaId: uuid("document_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  externalUrl: text("external_url"),
  embedUrl: text("embed_url"),
  embedProvider: text("embed_provider"),
  status: text("status", { enum: REPOSITORY_STATUSES }).notNull().default("draft"),
  source: text("source", { enum: ["admin", "public"] }).notNull().default("admin"),
  featured: boolean("featured").notNull().default(false),
  moderationNote: text("moderation_note"),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  consentAt: timestamp("consent_at"),
  consentVersion: text("consent_version"),
  referenceCode: text("reference_code"),
  publishedAt: timestamp("published_at"),
  searchVector: tsvector("search_vector").generatedAlwaysAs(
    sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(body_md, '') || ' ' || repository_text_array(tags))`,
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("repository_entries_slug_idx").on(table.slug),
  uniqueIndex("repository_entries_reference_code_idx").on(table.referenceCode),
  index("repository_entries_status_published_at_idx").on(table.status, table.publishedAt.desc()),
  index("repository_entries_kind_county_idx").on(table.kind, table.county),
  index("repository_entries_kind_category_idx").on(table.kind, table.category),
  index("repository_entries_search_idx").using("gin", table.searchVector),
  check("repository_entries_kind_check", sql`${table.kind} in ('competition_entry', 'innovation', 'conservation_resource', 'experience')`),
  check("repository_entries_status_check", sql`${table.status} in ('draft', 'submitted', 'approved', 'published', 'rejected', 'archived')`),
  check("repository_entries_source_check", sql`${table.source} in ('admin', 'public')`),
]);

// ── Gallery join ──
export const repositoryEntryMedia = pgTable("repository_entry_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id").notNull().references(() => repositoryEntries.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  uniqueIndex("repository_entry_media_entry_media_idx").on(table.entryId, table.mediaId),
  index("repository_entry_media_entry_sort_idx").on(table.entryId, table.sortOrder),
]);

// ── Anonymous upload intents (public presign → direct R2 PUT → HEAD check) ──
export const repositoryUploadIntents = pgTable("repository_upload_intents", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  expectedSizeBytes: bigint("expected_size_bytes", { mode: "number" }).notNull(),
  kind: text("kind", { enum: ["image", "document"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").default(sql`now() + interval '30 minutes'`).notNull(),
  consumedAt: timestamp("consumed_at"),
}, (table) => [
  uniqueIndex("repository_upload_intents_object_key_idx").on(table.objectKey),
  index("repository_upload_intents_expires_at_idx").on(table.expiresAt),
  check("repository_upload_intents_kind_check", sql`${table.kind} in ('image', 'document')`),
  check("repository_upload_intents_expected_size_check", sql`${table.expectedSizeBytes} > 0`),
]);

// ── Settings singleton ──
export const repositorySettings = pgTable("repository_settings", {
  id: text("id").primaryKey().default("default"),
  submissionsOpen: boolean("submissions_open").notNull().default(false),
  submissionIntro: text("submission_intro"),
  termsVersion: text("terms_version").notNull().default("2026-11"),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  check("repository_settings_singleton_check", sql`${table.id} = 'default'`),
]);

// ── Fixed category taxonomy per kind ──
// Not part of the catalogue itself: it backs admin dropdowns and validation so
// category labels stay stable. Entries store the display name in `category`.
export const repositoryCategories = pgTable("repository_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind", { enum: REPOSITORY_KINDS }).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("repository_categories_kind_slug_idx").on(table.kind, table.slug),
  index("repository_categories_kind_sort_idx").on(table.kind, table.sortOrder),
  check("repository_categories_kind_check", sql`${table.kind} in ('competition_entry', 'innovation', 'conservation_resource', 'experience')`),
]);
