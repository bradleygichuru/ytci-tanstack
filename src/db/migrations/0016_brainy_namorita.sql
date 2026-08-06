ALTER TABLE "user_profiles" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;

UPDATE "user_profiles" SET "onboarding_completed" = true;