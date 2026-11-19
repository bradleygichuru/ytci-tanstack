import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { destinations } from "./business";

// Mirrors the Go Then & Now content schema (0013) and privacy controls (0014).
// The Go API is the primary writer; this schema keeps the TanStack/Drizzle
// production migrations and future admin reads in sync.

export const heritageSites = pgTable(
  "heritage_sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    county: text("county").notNull(),
    locality: text("locality"),
    siteType: text("site_type", { enum: ["historical", "cultural"] }).notNull(),
    accessMode: text("access_mode", {
      enum: ["camera_video", "video_only", "not_available"],
    }).notNull(),
    sensitivity: text("sensitivity", {
      enum: ["standard", "sensitive", "restricted"],
    }).notNull(),
    status: text("status", {
      enum: ["draft", "published", "unpublished", "archived"],
    })
      .default("draft")
      .notNull(),
    managingAuthority: text("managing_authority"),
    destinationId: uuid("destination_id").references(() => destinations.id, {
      onDelete: "set null",
    }),
    photographyPolicy: text("photography_policy"),
    culturalAuthority: text("cultural_authority"),
    consentRecord: text("consent_record"),
    consentDate: date("consent_date"),
    siteRules: text("site_rules"),
    safetyNotes: text("safety_notes"),
    shortDescription: text("short_description"),
    fullDescription: text("full_description"),
    sources: text("sources"),
    factCheck: text("fact_check"),
    publicRightsLine: text("public_rights_line"),
    latitude: numeric("latitude", { precision: 10, scale: 8 }),
    longitude: numeric("longitude", { precision: 11, scale: 8 }),
    geofenceRadiusM: integer("geofence_radius_m").default(150).notNull(),
    standingPointNote: text("standing_point_note"),
    imageKey: text("image_key"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("heritage_sites_status_idx").on(table.status),
    index("heritage_sites_county_status_idx").on(table.county, table.status),
    index("heritage_sites_access_status_idx").on(table.accessMode, table.status),
    check(
      "heritage_sites_site_type_check",
      sql`${table.siteType} IN ('historical', 'cultural')`,
    ),
    check(
      "heritage_sites_access_mode_check",
      sql`${table.accessMode} IN ('camera_video', 'video_only', 'not_available')`,
    ),
    check(
      "heritage_sites_sensitivity_check",
      sql`${table.sensitivity} IN ('standard', 'sensitive', 'restricted')`,
    ),
    check(
      "heritage_sites_status_check",
      sql`${table.status} IN ('draft', 'published', 'unpublished', 'archived')`,
    ),
    check(
      "heritage_sites_geofence_check",
      sql`${table.geofenceRadiusM} BETWEEN 10 AND 5000`,
    ),
  ],
);

export const thenNowExperiences = pgTable(
  "then_now_experiences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => heritageSites.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status", {
      enum: [
        "draft",
        "in_review",
        "approved",
        "scheduled",
        "published",
        "unpublished",
        "archived",
        "revoked",
      ],
    })
      .default("draft")
      .notNull(),
    liveRevisionNumber: integer("live_revision_number").default(0).notNull(),
    openRevisionNumber: integer("open_revision_number").default(1).notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("then_now_experiences_site_idx").on(table.siteId),
    index("then_now_experiences_status_idx").on(table.status),
    check(
      "then_now_experiences_status_check",
      sql`${table.status} IN ('draft', 'in_review', 'approved', 'scheduled', 'published', 'unpublished', 'archived', 'revoked')`,
    ),
    check("then_now_experiences_live_revision_check", sql`${table.liveRevisionNumber} >= 0`),
    check("then_now_experiences_open_revision_check", sql`${table.openRevisionNumber} >= 1`),
  ],
);

export const thenNowRevisions = pgTable(
  "then_now_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    experienceId: uuid("experience_id")
      .notNull()
      .references(() => thenNowExperiences.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    status: text("status", { enum: ["draft", "in_review", "approved", "published"] })
      .default("draft")
      .notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    reviewNotes: jsonb("review_notes").$type<Record<string, unknown>[]>().default([]).notNull(),
    reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    submittedBy: text("submitted_by").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at"),
    lastDecision: text("last_decision", {
      enum: ["approved", "changes", "rejected", "returned"],
    }),
    secondReviewer: jsonb("second_reviewer"),
    secondReviewerApproved: boolean("second_reviewer_approved").default(false).notNull(),
    clientApproval: jsonb("client_approval"),
    scheduledAt: timestamp("scheduled_at"),
    scheduleNote: text("schedule_note"),
    publishedAt: timestamp("published_at"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("then_now_revisions_experience_revision_unique").on(
      table.experienceId,
      table.revisionNumber,
    ),
    index("then_now_revisions_experience_idx").on(
      table.experienceId,
      table.revisionNumber,
    ),
    index("then_now_revisions_status_idx").on(table.status),
    index("then_now_revisions_reviewer_idx").on(table.reviewerId),
    check("then_now_revisions_number_check", sql`${table.revisionNumber} >= 1`),
    check(
      "then_now_revisions_status_check",
      sql`${table.status} IN ('draft', 'in_review', 'approved', 'published')`,
    ),
    check(
      "then_now_revisions_decision_check",
      sql`${table.lastDecision} IS NULL OR ${table.lastDecision} IN ('approved', 'changes', 'rejected', 'returned')`,
    ),
  ],
);

export const thenNowAuditEvents = pgTable(
  "then_now_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type", { enum: ["site", "experience", "revision"] }).notNull(),
    entityId: uuid("entity_id").notNull(),
    eventType: text("event_type").notNull(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("then_now_audit_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index("then_now_audit_created_idx").on(table.createdAt),
    check(
      "then_now_audit_entity_type_check",
      sql`${table.entityType} IN ('site', 'experience', 'revision')`,
    ),
  ],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    version: text("version").notNull(),
    location: boolean("location").default(false).notNull(),
    camera: boolean("camera").default(false).notNull(),
    notifications: boolean("notifications").default(false).notNull(),
    ugc: boolean("ugc").default(false).notNull(),
    recognition: boolean("recognition").default(false).notNull(),
    locationVerification: boolean("location_verification").default(false).notNull(),
    publicProfile: boolean("public_profile").default(false).notNull(),
    leaderboard: boolean("leaderboard").default(false).notNull(),
    analytics: boolean("analytics").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("consent_records_user_idx").on(table.userId, table.createdAt)],
);

export const analyticsIdMap = pgTable("analytics_id_map", {
  analyticsId: uuid("analytics_id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const anonymousHeritageCounts = pgTable(
  "anonymous_heritage_counts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    day: date("day").default(sql`CURRENT_DATE`).notNull(),
    scope: text("scope", { enum: ["site", "sensitive"] }).notNull(),
    siteId: uuid("site_id").references(() => heritageSites.id, { onDelete: "set null" }),
    event: text("event", {
      enum: ["portal_opened", "video_played", "visit_marked", "verified_visit"],
    }).notNull(),
    count: bigint("count", { mode: "number" }).default(0).notNull(),
  },
  (table) => [
    unique("anonymous_heritage_counts_unique")
      .on(table.day, table.scope, table.siteId, table.event)
      .nullsNotDistinct(),
    index("anonymous_heritage_counts_day_idx").on(table.day, table.event),
    check(
      "anonymous_heritage_counts_scope_check",
      sql`${table.scope} IN ('site', 'sensitive')`,
    ),
    check(
      "anonymous_heritage_counts_event_check",
      sql`${table.event} IN ('portal_opened', 'video_played', 'visit_marked', 'verified_visit')`,
    ),
    check("anonymous_heritage_counts_count_check", sql`${table.count} >= 0`),
  ],
);
