CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"badge_name" text NOT NULL,
	"badge_icon_url" text,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"source_title" text,
	"awarded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conservation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"activity_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conservation_activities" ADD COLUMN "impact_actual" integer;--> statement-breakpoint
ALTER TABLE "conservation_activities" ADD COLUMN "measurement_unit" text;--> statement-breakpoint
ALTER TABLE "conservation_evidence" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "conservation_participants" ADD CONSTRAINT "conservation_participants_activity_id_conservation_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."conservation_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_badges_user_source" ON "badges" USING btree ("user_id","source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_conservation_participants_user_activity" ON "conservation_participants" USING btree ("user_id","activity_id");