CREATE TABLE "event_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" text NOT NULL,
	"icon" text,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "start_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "end_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "entry_fee" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "location_lat" numeric(10, 8);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "location_lng" numeric(11, 8);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "organizer_avatar_url" text;--> statement-breakpoint
ALTER TABLE "itinerary_stops" ADD COLUMN "start_time" text;--> statement-breakpoint
ALTER TABLE "itinerary_stops" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "itinerary_stops" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_highlights" ADD CONSTRAINT "event_highlights_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_attendees_user_event_status_idx" ON "event_attendees" USING btree ("user_id","event_id","status");--> statement-breakpoint
CREATE INDEX "event_attendees_event_idx" ON "event_attendees" USING btree ("event_id");