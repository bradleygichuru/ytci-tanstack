ALTER TABLE "alert_preferences" ALTER COLUMN "categories" SET DEFAULT ARRAY['Met']::text[];
ALTER TABLE "alert_preferences" ALTER COLUMN "critical_override" SET DEFAULT false;
