ALTER TABLE "alert_preferences" ALTER COLUMN "os_permission_ok" SET DEFAULT false;

INSERT INTO "alert_preferences" ("user_id")
SELECT "user_id" FROM "user_profiles" WHERE "consent_notifications" = true
ON CONFLICT ("user_id") DO NOTHING;

UPDATE "alert_preferences" p SET "home_county_gid" = kc."gid"
FROM "user_profiles" up
JOIN "kenya_counties" kc ON lower(kc."adm1_name") = lower(trim(up."county"))
WHERE p."user_id" = up."user_id" AND p."home_county_gid" IS NULL;
