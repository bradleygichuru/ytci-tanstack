ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "challenge_progress" DROP CONSTRAINT "challenge_progress_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "challenge_progress" DROP CONSTRAINT "challenge_progress_moderated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "challenges" DROP CONSTRAINT "challenges_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conservation_activities" DROP CONSTRAINT "conservation_activities_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conservation_evidence" DROP CONSTRAINT "conservation_evidence_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conservation_evidence" DROP CONSTRAINT "conservation_evidence_moderated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "destinations" DROP CONSTRAINT "destinations_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "itineraries" DROP CONSTRAINT "itineraries_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "media_assets" DROP CONSTRAINT "media_assets_moderated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "media_assets" DROP CONSTRAINT "media_assets_uploaded_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pending_media_uploads" DROP CONSTRAINT "pending_media_uploads_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "push_notifications" DROP CONSTRAINT "push_notifications_sent_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "report_jobs" DROP CONSTRAINT "report_jobs_requested_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "stories" DROP CONSTRAINT "stories_creator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "stories" DROP CONSTRAINT "stories_moderated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "story_comments" DROP CONSTRAINT "story_comments_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "story_reports" DROP CONSTRAINT "story_reports_reported_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "challenge_progress" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conservation_evidence" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "course_enrollments" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "itineraries" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_jobs" ALTER COLUMN "requested_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "creator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "story_comments" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "story_reports" ALTER COLUMN "reported_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conservation_activities" ADD CONSTRAINT "conservation_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conservation_evidence" ADD CONSTRAINT "conservation_evidence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conservation_evidence" ADD CONSTRAINT "conservation_evidence_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_media_uploads" ADD CONSTRAINT "pending_media_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notifications" ADD CONSTRAINT "push_notifications_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_comments" ADD CONSTRAINT "story_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reports" ADD CONSTRAINT "story_reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;