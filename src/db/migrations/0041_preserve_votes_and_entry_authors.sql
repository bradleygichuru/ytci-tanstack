-- Preserve People's Choice votes when a voter deletes their account, and give
-- repository entries a stable author link.

ALTER TABLE "competition_votes" DROP CONSTRAINT IF EXISTS "competition_votes_voter_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "competition_votes" ALTER COLUMN "voter_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "competition_votes" ADD CONSTRAINT "competition_votes_voter_user_id_users_id_fk" FOREIGN KEY ("voter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "repository_entries" ADD COLUMN IF NOT EXISTS "author_user_id" text;--> statement-breakpoint
ALTER TABLE "repository_entries" DROP CONSTRAINT IF EXISTS "repository_entries_author_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "repository_entries" ADD CONSTRAINT "repository_entries_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repository_entries_author_user_idx" ON "repository_entries" USING btree ("author_user_id");--> statement-breakpoint

UPDATE "repository_entries" re
SET "author_user_id" = u."id"
FROM "users" u
WHERE re."author_user_id" IS NULL
  AND re."author_email" IS NOT NULL
  AND u."email_verified" = true
  AND lower(u."email") = lower(re."author_email");
