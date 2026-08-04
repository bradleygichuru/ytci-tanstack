CREATE TABLE "google_places_cache" (
	"place_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"formatted_address" text,
	"lat" double precision,
	"lng" double precision,
	"types" text[],
	"data" jsonb,
	"cached_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_places_search_cache" (
	"query_hash" text PRIMARY KEY NOT NULL,
	"response" jsonb,
	"cached_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "google_place_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_google_place_id_unique" ON "destinations" USING btree ("google_place_id") WHERE "destinations"."google_place_id" is not null;