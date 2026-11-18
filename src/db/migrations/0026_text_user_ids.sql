ALTER TABLE "push_tokens" ALTER COLUMN "user_id" TYPE text USING "user_id"::text;
ALTER TABLE "push_notifications" ALTER COLUMN "sent_by" TYPE text USING "sent_by"::text;
ALTER TABLE "campaigns" ALTER COLUMN "created_by" TYPE text USING "created_by"::text;
