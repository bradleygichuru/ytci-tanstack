import { relations } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, date, index, uniqueIndex, primaryKey, customType } from "drizzle-orm/pg-core";
import { users } from "./auth";

const geometry = customType<{ data: string }>({
  dataType() { return "geometry(Point, 4326)"; },
});

// ── Destinations ──
export const destinations = pgTable("destinations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  county: text("county").notNull(),
  locality: text("locality"),
  category: text("category").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).default("draft").notNull(),
  location: geometry("location"),
  mapLabel: text("map_label"),
  accessRoute: text("access_route"),
  distanceReference: text("distance_reference"),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),
  significance: text("significance"),
  history: text("history"),
  thingsToDo: text("things_to_do"),
  suitableAudiences: text("suitable_audiences"),
  duration: text("duration"),
  difficulty: text("difficulty"),
  seasonality: text("seasonality"),
  indicativeFees: text("indicative_fees"),
  openingInfo: text("opening_info"),
  transportNotes: text("transport_notes"),
  accessibility: text("accessibility"),
  facilities: text("facilities"),
  safetyNotes: text("safety_notes"),
  source: text("source"),
  contentOwner: text("content_owner"),
  verificationStatus: text("verification_status"),
  lastUpdated: timestamp("last_updated"),
  reviewDate: timestamp("review_date"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("destinations_location_idx").using("gist", table.location),
  index("destinations_county_category_status_idx").on(table.county, table.category, table.status),
]);

// ── Events ──
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  organizer: text("organizer").notNull(),
  county: text("county").notNull(),
  venue: text("venue"),
  eventDate: date("event_date").notNull(),
  endDate: date("end_date"),
  type: text("type", { enum: ["cultural", "sports", "conservation", "tourism"] }).notNull(),
  status: text("status", { enum: ["scheduled", "postponed", "cancelled"] }).default("scheduled").notNull(),
  description: text("description"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  imageUrl: text("image_url"),
  reminderEnabled: boolean("reminder_enabled").default(false),
  reminderMinutes: integer("reminder_minutes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("events_county_type_status_date_idx").on(table.county, table.type, table.status, table.eventDate),
]);

// ── Stories ──
export const stories = pgTable("stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  caption: text("caption"),
  journal: text("journal"),
  tags: text("tags"),
  status: text("status", { enum: ["draft", "pending", "approved", "rejected"] }).default("draft").notNull(),
  moderatedBy: text("moderated_by").references(() => users.id),
  moderationNote: text("moderation_note"),
  moderatedAt: timestamp("moderated_at"),
  likeCount: integer("like_count").default(0),
  saveCount: integer("save_count").default(0),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("stories_creator_idx").on(table.creatorId),
  index("stories_status_idx").on(table.status),
  index("stories_created_idx").on(table.createdAt),
]);

// ── Story Interactions ──
export const storyInteractions = pgTable("story_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  interactionType: text("interaction_type", { enum: ["like", "save"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("story_interactions_user_story_type_idx").on(table.userId, table.storyId, table.interactionType),
  index("story_interactions_story_idx").on(table.storyId),
]);

// ── Media Assets ──
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type", { enum: ["destination", "story", "event", "course", "conservation_activity", "user"] }).notNull(),
  entityId: text("entity_id").notNull(),
  objectKey: text("object_key").notNull(),
  thumbnailKey: text("thumbnail_key"),
  type: text("type", { enum: ["image", "video", "audio", "pdf", "360"] }).notNull(),
  altText: text("alt_text"),
  caption: text("caption"),
  credit: text("credit"),
  rightsStatus: text("rights_status"),
  fileSizeBytes: integer("file_size_bytes"),
  duration: integer("duration"),
  originalName: text("original_name"),
  displayOrder: integer("display_order").default(0),
  status: text("status", { enum: ["uploading", "processing", "ready", "failed", "pending_review", "removed"] }).default("uploading").notNull(),
  moderatedBy: text("moderated_by").references(() => users.id),
  moderationNote: text("moderation_note"),
  moderatedAt: timestamp("moderated_at"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("media_entity_type_id_idx").on(table.entityType, table.entityId),
]);

// ── Courses ──
export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  status: text("status", { enum: ["draft", "published"] }).default("draft").notNull(),
  imageUrl: text("image_url"),
  passThreshold: integer("pass_threshold").default(70),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type", { enum: ["video", "pdf", "text"] }).notNull(),
  contentUrl: text("content_url"),
  duration: integer("duration"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  questions: jsonb("questions").notNull(),
  passThreshold: integer("pass_threshold").default(70),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courseEnrollments = pgTable("course_enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  completedLessonIds: jsonb("completed_lesson_ids").default("[]"),
  quizAttempts: jsonb("quiz_attempts").default("{}"),
  certificateUrl: text("certificate_url"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── Challenges ──
export const challenges = pgTable("challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  rules: text("rules"),
  badgeName: text("badge_name"),
  badgeIconUrl: text("badge_icon_url"),
  eligibility: jsonb("eligibility"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status", { enum: ["draft", "active", "ended"] }).default("draft").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const challengeProgress = pgTable("challenge_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["joined", "in_progress", "submitted", "approved", "rejected"] }).default("joined").notNull(),
  progress: jsonb("progress").default("{}"),
  evidence: jsonb("evidence"),
  moderatedBy: text("moderated_by").references(() => users.id),
  moderationNote: text("moderation_note"),
  badgeAwardedAt: timestamp("badge_awarded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── Conservation Activities ──
export const conservationActivities = pgTable("conservation_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  organizer: text("organizer").notNull(),
  description: text("description"),
  location: geometry("location"),
  locationLabel: text("location_label"),
  privacyLevel: text("privacy_level", { enum: ["public", "approximate", "hidden"] }).default("public").notNull(),
  eventDate: date("event_date"),
  impactMetric: text("impact_metric"),
  impactTarget: integer("impact_target"),
  participantLimit: integer("participant_limit"),
  currentParticipants: integer("current_participants").default(0),
  status: text("status", { enum: ["open", "full", "completed", "cancelled"] }).default("open").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("conservation_activities_location_idx").using("gist", table.location),
]);

export const conservationEvidence = pgTable("conservation_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityId: uuid("activity_id").notNull().references(() => conservationActivities.id, { onDelete: "cascade" }),
  description: text("description"),
  mediaIds: text("media_ids"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  moderatedBy: text("moderated_by").references(() => users.id),
  moderationNote: text("moderation_note"),
  moderatedAt: timestamp("moderated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Campaigns ──
export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  bannerUrl: text("banner_url"),
  type: text("type", { enum: ["home_banner", "featured_destination", "push_notification", "seasonal"] }).notNull(),
  status: text("status", { enum: ["draft", "active", "paused", "ended"] }).default("draft").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  targetUrl: text("target_url"),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  audience: text("audience"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── Push Tokens ──
export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: text("platform", { enum: ["ios", "android"] }),
  deviceInfo: text("device_info"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("push_tokens_user_active_idx").on(table.userId, table.isActive),
]);

export const pushNotifications = pgTable("push_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  data: text("data"),
  targetAudience: text("target_audience"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count"),
  status: text("status", { enum: ["draft", "scheduled", "sending", "sent", "failed"] }).default("draft").notNull(),
  sentBy: text("sent_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Itineraries ──
export const itineraries = pgTable("itineraries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  inputs: jsonb("inputs").notNull(),
  totalBudget: text("total_budget"),
  disclaimer: text("disclaimer"),
  status: text("status", { enum: ["draft", "saved", "exported"] }).default("draft").notNull(),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const itineraryStops = pgTable("itinerary_stops", {
  id: uuid("id").defaultRandom().primaryKey(),
  itineraryId: uuid("itinerary_id").notNull().references(() => itineraries.id, { onDelete: "cascade" }),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  day: integer("day").notNull(),
  displayOrder: integer("display_order").notNull(),
  title: text("title"),
  description: text("description"),
  estimatedDuration: text("estimated_duration"),
  estimatedCost: text("estimated_cost"),
  travelFrom: text("travel_from"),
  notes: text("notes"),
});

// ── Bucket List ──
export const bucketListItems = pgTable("bucket_list_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  visited: boolean("visited").default(false),
  visitedAt: timestamp("visited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("bucket_list_user_idx").on(table.userId),
]);

// ── App Opens ──
export const appOpens = pgTable("app_opens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: ["ios", "android"] }),
  appVersion: text("app_version"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
});

// ── Report Jobs ──
export const reportJobs = pgTable("report_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestedBy: text("requested_by").notNull().references(() => users.id),
  format: text("format", { enum: ["csv", "pdf"] }).notNull(),
  dateFrom: date("date_from").notNull(),
  dateTo: date("date_to").notNull(),
  sections: text("sections"),
  status: text("status", { enum: ["generating", "ready", "failed"] }).default("generating").notNull(),
  fileKey: text("file_key"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// ── Story Reports ──
export const storyReports = pgTable("story_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  reportedBy: text("reported_by").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  details: text("details"),
  reviewed: boolean("reviewed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Event Saves ──
export const eventSaves = pgTable("event_saves", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.eventId] }),
]);

// ── Kenya Counties (PostGIS loaded via ogr2ogr) ──
export const kenyaCounties = pgTable("kenya_counties", {
  gid: integer("gid").primaryKey(),
  adm1Name: text("adm1_name").notNull(),
  adm1Pcode: text("adm1_pcode"),
  areaSqkm: integer("area_sqkm"),
  geom: customType<{ data: string }>({ dataType() { return "geometry(MultiPolygon, 4326)"; } })("geom"),
}, (table) => [
  index("kenya_counties_geom_idx").using("gist", table.geom),
]);
