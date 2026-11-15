ALTER TABLE "alert_preferences" ADD COLUMN IF NOT EXISTS "os_permission_ok" boolean DEFAULT true NOT NULL;
