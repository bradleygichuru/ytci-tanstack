CREATE TABLE "analytics_id_map" (
	"analytics_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_id_map_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "anonymous_heritage_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" date DEFAULT CURRENT_DATE NOT NULL,
	"scope" text NOT NULL,
	"site_id" uuid,
	"event" text NOT NULL,
	"count" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "anonymous_heritage_counts_unique" UNIQUE NULLS NOT DISTINCT("day","scope","site_id","event"),
	CONSTRAINT "anonymous_heritage_counts_scope_check" CHECK ("anonymous_heritage_counts"."scope" IN ('site', 'sensitive')),
	CONSTRAINT "anonymous_heritage_counts_event_check" CHECK ("anonymous_heritage_counts"."event" IN ('portal_opened', 'video_played', 'visit_marked', 'verified_visit')),
	CONSTRAINT "anonymous_heritage_counts_count_check" CHECK ("anonymous_heritage_counts"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"version" text NOT NULL,
	"location" boolean DEFAULT false NOT NULL,
	"camera" boolean DEFAULT false NOT NULL,
	"notifications" boolean DEFAULT false NOT NULL,
	"ugc" boolean DEFAULT false NOT NULL,
	"recognition" boolean DEFAULT false NOT NULL,
	"location_verification" boolean DEFAULT false NOT NULL,
	"public_profile" boolean DEFAULT false NOT NULL,
	"leaderboard" boolean DEFAULT false NOT NULL,
	"analytics" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heritage_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"county" text NOT NULL,
	"locality" text,
	"site_type" text NOT NULL,
	"access_mode" text NOT NULL,
	"sensitivity" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"managing_authority" text,
	"destination_id" uuid,
	"photography_policy" text,
	"cultural_authority" text,
	"consent_record" text,
	"consent_date" date,
	"site_rules" text,
	"safety_notes" text,
	"short_description" text,
	"full_description" text,
	"sources" text,
	"fact_check" text,
	"public_rights_line" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"geofence_radius_m" integer DEFAULT 150 NOT NULL,
	"standing_point_note" text,
	"image_key" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "heritage_sites_slug_unique" UNIQUE("slug"),
	CONSTRAINT "heritage_sites_site_type_check" CHECK ("heritage_sites"."site_type" IN ('historical', 'cultural')),
	CONSTRAINT "heritage_sites_access_mode_check" CHECK ("heritage_sites"."access_mode" IN ('camera_video', 'video_only', 'not_available')),
	CONSTRAINT "heritage_sites_sensitivity_check" CHECK ("heritage_sites"."sensitivity" IN ('standard', 'sensitive', 'restricted')),
	CONSTRAINT "heritage_sites_status_check" CHECK ("heritage_sites"."status" IN ('draft', 'published', 'unpublished', 'archived')),
	CONSTRAINT "heritage_sites_geofence_check" CHECK ("heritage_sites"."geofence_radius_m" BETWEEN 10 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "then_now_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" text,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "then_now_audit_entity_type_check" CHECK ("then_now_audit_events"."entity_type" IN ('site', 'experience', 'revision'))
);
--> statement-breakpoint
CREATE TABLE "then_now_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"live_revision_number" integer DEFAULT 0 NOT NULL,
	"open_revision_number" integer DEFAULT 1 NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "then_now_experiences_status_check" CHECK ("then_now_experiences"."status" IN ('draft', 'in_review', 'approved', 'scheduled', 'published', 'unpublished', 'archived', 'revoked')),
	CONSTRAINT "then_now_experiences_live_revision_check" CHECK ("then_now_experiences"."live_revision_number" >= 0),
	CONSTRAINT "then_now_experiences_open_revision_check" CHECK ("then_now_experiences"."open_revision_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "then_now_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"review_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewer_id" text,
	"submitted_by" text,
	"submitted_at" timestamp,
	"last_decision" text,
	"second_reviewer" jsonb,
	"second_reviewer_approved" boolean DEFAULT false NOT NULL,
	"client_approval" jsonb,
	"scheduled_at" timestamp,
	"schedule_note" text,
	"published_at" timestamp,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "then_now_revisions_experience_revision_unique" UNIQUE("experience_id","revision_number"),
	CONSTRAINT "then_now_revisions_number_check" CHECK ("then_now_revisions"."revision_number" >= 1),
	CONSTRAINT "then_now_revisions_status_check" CHECK ("then_now_revisions"."status" IN ('draft', 'in_review', 'approved', 'published')),
	CONSTRAINT "then_now_revisions_decision_check" CHECK ("then_now_revisions"."last_decision" IS NULL OR "then_now_revisions"."last_decision" IN ('approved', 'changes', 'rejected', 'returned'))
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_opens" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "consent_version" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "consent_recognition" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "consent_location_verification" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "consent_public_profile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "consent_leaderboard" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "consent_analytics" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "consent_withdrawn_at" timestamp;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "analytics_id" uuid;--> statement-breakpoint
ALTER TABLE "app_opens" ADD COLUMN "analytics_id" uuid;--> statement-breakpoint
ALTER TABLE "analytics_id_map" ADD CONSTRAINT "analytics_id_map_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anonymous_heritage_counts" ADD CONSTRAINT "anonymous_heritage_counts_site_id_heritage_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."heritage_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heritage_sites" ADD CONSTRAINT "heritage_sites_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heritage_sites" ADD CONSTRAINT "heritage_sites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heritage_sites" ADD CONSTRAINT "heritage_sites_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_audit_events" ADD CONSTRAINT "then_now_audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_experiences" ADD CONSTRAINT "then_now_experiences_site_id_heritage_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."heritage_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_experiences" ADD CONSTRAINT "then_now_experiences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_experiences" ADD CONSTRAINT "then_now_experiences_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_revisions" ADD CONSTRAINT "then_now_revisions_experience_id_then_now_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."then_now_experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_revisions" ADD CONSTRAINT "then_now_revisions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_revisions" ADD CONSTRAINT "then_now_revisions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_revisions" ADD CONSTRAINT "then_now_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "then_now_revisions" ADD CONSTRAINT "then_now_revisions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anonymous_heritage_counts_day_idx" ON "anonymous_heritage_counts" USING btree ("day","event");--> statement-breakpoint
CREATE INDEX "consent_records_user_idx" ON "consent_records" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "heritage_sites_status_idx" ON "heritage_sites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "heritage_sites_county_status_idx" ON "heritage_sites" USING btree ("county","status");--> statement-breakpoint
CREATE INDEX "heritage_sites_access_status_idx" ON "heritage_sites" USING btree ("access_mode","status");--> statement-breakpoint
CREATE INDEX "then_now_audit_entity_idx" ON "then_now_audit_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "then_now_audit_created_idx" ON "then_now_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "then_now_experiences_site_idx" ON "then_now_experiences" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "then_now_experiences_status_idx" ON "then_now_experiences" USING btree ("status");--> statement-breakpoint
CREATE INDEX "then_now_revisions_experience_idx" ON "then_now_revisions" USING btree ("experience_id","revision_number");--> statement-breakpoint
CREATE INDEX "then_now_revisions_status_idx" ON "then_now_revisions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "then_now_revisions_reviewer_idx" ON "then_now_revisions" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "analytics_events_analytics_idx" ON "analytics_events" USING btree ("analytics_id","created_at");--> statement-breakpoint
CREATE INDEX "app_opens_analytics_idx" ON "app_opens" USING btree ("analytics_id","opened_at");