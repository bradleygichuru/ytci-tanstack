ALTER TABLE "courses" ADD COLUMN "certificate_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "certificate_template" text DEFAULT 'standard';