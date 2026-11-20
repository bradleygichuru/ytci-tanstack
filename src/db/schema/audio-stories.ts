import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { mediaAssets } from "./business";

// ── Audio Story Collections ──
export const audioStoryCollections = pgTable("audio_story_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  status: text("status", { enum: ["draft", "scheduled", "published", "unpublished", "archived"] }).default("draft").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  featured: boolean("featured").default(false).notNull(),
  featuredOrder: integer("featured_order"),
  publishAt: timestamp("publish_at"),
  firstPublishedAt: timestamp("first_published_at"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("audio_story_collections_status_order_idx").on(table.status, table.displayOrder),
]);

// ── Audio Stories (identity + current metadata; material content lives on revisions) ──
export const audioStories = pgTable("audio_stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  summary: text("summary").notNull(),
  theme: text("theme", {
    enum: ["culture_heritage", "nature_wildlife", "history_places", "conservation_action", "youth_perspectives"],
  }).notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  producer: text("producer").notNull(),
  communitySource: text("community_source").notNull(),
  recordedAt: date("recorded_at"),
  collectionId: uuid("collection_id").references(() => audioStoryCollections.id, { onDelete: "set null" }),
  collectionOrder: integer("collection_order").default(0).notNull(),
  featured: boolean("featured").default(false).notNull(),
  featuredOrder: integer("featured_order"),
  status: text("status", {
    enum: ["draft", "in_review", "approved", "scheduled", "published", "unpublished", "archived", "revoked"],
  }).default("draft").notNull(),
  liveRevisionId: uuid("live_revision_id"),
  openRevisionId: uuid("open_revision_id"),
  contentVersion: integer("content_version").default(0).notNull(),
  firstPublishedAt: timestamp("first_published_at"),
  unpublishedAt: timestamp("unpublished_at"),
  archivedAt: timestamp("archived_at"),
  revokedAt: timestamp("revoked_at"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("audio_stories_status_updated_idx").on(table.status, table.updatedAt),
  index("audio_stories_collection_order_idx").on(table.collectionId, table.collectionOrder),
  index("audio_stories_featured_order_idx").on(table.featured, table.featuredOrder),
]);

// ── Revisions (material, reviewable snapshots) ──
export const audioStoryRevisions = pgTable("audio_story_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id").notNull().references(() => audioStories.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["draft", "in_review", "approved", "scheduled", "published", "superseded", "cancelled"],
  }).default("draft").notNull(),
  contentVersion: integer("content_version").default(0).notNull(),
  placeScope: text("place_scope", { enum: ["county", "multi_county", "national"] }).notNull(),
  counties: text("counties").array().notNull().default(sql`'{}'::text[]`),
  destinationIds: uuid("destination_ids").array().notNull().default(sql`'{}'::uuid[]`),
  contentNoteCategories: text("content_note_categories").array().notNull().default(sql`'{}'::text[]`),
  contentNoteText: text("content_note_text"),
  rightsBasis: text("rights_basis", { enum: ["ytci_owned", "partner_permission", "licensed", "public_domain"] }).notNull(),
  rightsHolder: text("rights_holder").notNull(),
  licenceReference: text("licence_reference"),
  rightsExpiresAt: timestamp("rights_expires_at"),
  riskTier: text("risk_tier", { enum: ["standard", "sensitive", "restricted"] }).default("standard").notNull(),
  attestedBy: text("attested_by").references(() => users.id, { onDelete: "set null" }),
  attestedAt: timestamp("attested_at"),
  assignedReviewerId: text("assigned_reviewer_id").references(() => users.id, { onDelete: "set null" }),
  secondReviewerId: text("second_reviewer_id").references(() => users.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  publishAt: timestamp("publish_at"),
  publishedAt: timestamp("published_at"),
  revokedAt: timestamp("revoked_at"),
  revocationReason: text("revocation_reason"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("audio_story_revisions_story_status_idx").on(table.storyId, table.status),
  index("audio_story_revisions_queue_idx").on(table.status, table.submittedAt),
  index("audio_story_revisions_publish_idx").on(table.status, table.publishAt),
  index("audio_story_revisions_reviewer_idx").on(table.assignedReviewerId, table.status),
]);

// ── Language tracks ──
export const audioStoryTracks = pgTable("audio_story_tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionId: uuid("revision_id").notNull().references(() => audioStoryRevisions.id, { onDelete: "cascade" }),
  language: text("language", { enum: ["en", "sw"] }).notNull(),
  mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  audioObjectKey: text("audio_object_key").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  narrator: text("narrator").notNull(),
  narratorConsentDate: date("narrator_consent_date"),
  narratorConsentReference: text("narrator_consent_reference"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  format: text("format"),
  bitrateKbps: integer("bitrate_kbps"),
  recordedAt: date("recorded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("audio_story_tracks_revision_language_unique").on(table.revisionId, table.language),
]);

// ── Transcripts ──
export const audioStoryTranscripts = pgTable("audio_story_transcripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionId: uuid("revision_id").notNull().references(() => audioStoryRevisions.id, { onDelete: "cascade" }),
  language: text("language", { enum: ["en", "sw"] }).notNull(),
  paragraphs: jsonb("paragraphs").notNull().$type<Array<{ text: string; speaker?: string; startSeconds?: number }>>(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  source: text("source").default("human"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("audio_story_transcripts_revision_language_unique").on(table.revisionId, table.language),
]);

// ── Review decisions ──
export const audioStoryReviews = pgTable("audio_story_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionId: uuid("revision_id").notNull().references(() => audioStoryRevisions.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  externalReviewerName: text("external_reviewer_name"),
  externalReviewerAffiliation: text("external_reviewer_affiliation"),
  decision: text("decision", { enum: ["approve", "request_changes", "reject"] }).notNull(),
  riskTier: text("risk_tier", { enum: ["standard", "sensitive", "restricted"] }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audio_story_reviews_revision_idx").on(table.revisionId, table.createdAt),
]);

// ── Append-only audit events ──
export const audioStoryEvents = pgTable("audio_story_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id"),
  revisionId: uuid("revision_id"),
  trackId: uuid("track_id"),
  collectionId: uuid("collection_id"),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audio_story_events_story_idx").on(table.storyId, table.createdAt),
  index("audio_story_events_revision_idx").on(table.revisionId, table.createdAt),
]);

// ── Listener state (saved stories and playback progress) ──
export const audioStorySaves = pgTable("audio_story_saves", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").notNull().references(() => audioStories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("audio_story_saves_user_story_unique").on(table.userId, table.storyId),
  index("audio_story_saves_user_idx").on(table.userId, table.createdAt),
]);

export const audioStoryProgress = pgTable("audio_story_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").notNull().references(() => audioStories.id, { onDelete: "cascade" }),
  positionSeconds: integer("position_seconds").default(0).notNull(),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  language: text("language"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("audio_story_progress_user_story_unique").on(table.userId, table.storyId),
  index("audio_story_progress_user_idx").on(table.userId, table.updatedAt),
]);
