ALTER TABLE "alert_preferences" ADD COLUMN IF NOT EXISTS "program_important_only" boolean DEFAULT true NOT NULL;
