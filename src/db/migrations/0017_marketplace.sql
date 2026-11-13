CREATE TABLE "accommodation_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"tier" text NOT NULL,
	"property_type" text NOT NULL,
	"short_description" text NOT NULL,
	"full_description" text,
	"county" text NOT NULL,
	"locality" text,
	"address" text,
	"location_lat" numeric(10, 8),
	"location_lng" numeric(11, 8),
	"price_from_kes" integer,
	"price_note" text,
	"price_checked_at" date,
	"distance_note" text,
	"cancellation_note" text,
	"payment_note" text,
	"included_note" text,
	"badge_label" text,
	"amenities" text[] DEFAULT '{}'::text[] NOT NULL,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"booking_url" text,
	"direct_url" text,
	"disclosure" text,
	"contact_email" text,
	"contact_phone" text,
	"image_url" text,
	"image_alt" text,
	"image_credit" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accommodation_properties_slug_unique" UNIQUE("slug"),
	CONSTRAINT "accommodation_properties_tier_check" CHECK ("accommodation_properties"."tier" in ('luxury', 'midrange', 'budget')),
	CONSTRAINT "accommodation_properties_property_type_check" CHECK ("accommodation_properties"."property_type" in ('lodge', 'camp', 'hotel', 'hostel', 'guesthouse', 'apartment', 'villa')),
	CONSTRAINT "accommodation_properties_status_check" CHECK ("accommodation_properties"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "accommodation_properties_display_order_check" CHECK ("accommodation_properties"."display_order" >= 0 and "accommodation_properties"."display_order" <= 10000),
	CONSTRAINT "accommodation_properties_price_from_kes_check" CHECK ("accommodation_properties"."price_from_kes" is null or "accommodation_properties"."price_from_kes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "esim_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"headline" text,
	"description" text NOT NULL,
	"coverage_note" text,
	"price_label" text,
	"redirect_url" text NOT NULL,
	"redirect_label" text DEFAULT 'Get connected',
	"disclosure" text,
	"logo_url" text,
	"logo_alt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "esim_providers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "esim_providers_status_check" CHECK ("esim_providers"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "esim_providers_display_order_check" CHECK ("esim_providers"."display_order" >= 0 and "esim_providers"."display_order" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "marketplace_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" text,
	"source" text,
	"platform" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_redirects_entity_type_check" CHECK ("marketplace_redirects"."entity_type" in ('partner_business', 'accommodation', 'esim_provider')),
	CONSTRAINT "marketplace_redirects_platform_check" CHECK ("marketplace_redirects"."platform" in ('ios', 'android', 'web'))
);
--> statement-breakpoint
CREATE TABLE "partner_businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"tagline" text,
	"short_description" text NOT NULL,
	"full_description" text,
	"county" text,
	"locality" text,
	"service_area" text,
	"address" text,
	"location_lat" numeric(10, 8),
	"location_lng" numeric(11, 8),
	"contact_email" text,
	"contact_phone" text,
	"redirect_url" text NOT NULL,
	"redirect_label" text DEFAULT 'Visit partner',
	"disclosure" text,
	"image_url" text,
	"image_alt" text,
	"image_credit" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partner_businesses_slug_unique" UNIQUE("slug"),
	CONSTRAINT "partner_businesses_category_check" CHECK ("partner_businesses"."category" in ('experiences', 'food_drink', 'transport', 'shopping', 'services', 'connectivity')),
	CONSTRAINT "partner_businesses_status_check" CHECK ("partner_businesses"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "partner_businesses_display_order_check" CHECK ("partner_businesses"."display_order" >= 0 and "partner_businesses"."display_order" <= 10000)
);
--> statement-breakpoint
ALTER TABLE "accommodation_properties" ADD CONSTRAINT "accommodation_properties_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esim_providers" ADD CONSTRAINT "esim_providers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_redirects" ADD CONSTRAINT "marketplace_redirects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_businesses" ADD CONSTRAINT "partner_businesses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accommodation_properties_tier_status_idx" ON "accommodation_properties" USING btree ("tier","status");--> statement-breakpoint
CREATE INDEX "accommodation_properties_county_status_idx" ON "accommodation_properties" USING btree ("county","status");--> statement-breakpoint
CREATE INDEX "accommodation_properties_status_featured_order_idx" ON "accommodation_properties" USING btree ("status","is_featured","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "esim_providers_one_featured_idx" ON "esim_providers" USING btree ("is_featured") WHERE "esim_providers"."is_featured" = true and "esim_providers"."status" = 'published';--> statement-breakpoint
CREATE INDEX "marketplace_redirects_entity_idx" ON "marketplace_redirects" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "partner_businesses_category_status_idx" ON "partner_businesses" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "partner_businesses_county_status_idx" ON "partner_businesses" USING btree ("county","status");--> statement-breakpoint
CREATE INDEX "partner_businesses_status_featured_order_idx" ON "partner_businesses" USING btree ("status","is_featured","display_order");