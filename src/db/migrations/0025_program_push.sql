ALTER TABLE "program_updates" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'admin' NOT NULL;
ALTER TABLE "program_updates" ADD COLUMN IF NOT EXISTS "source_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "program_updates_campaign_source_idx"
  ON "program_updates" ("source", "source_id") WHERE "source" = 'campaign' AND "source_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "program_update_deliveries" (
  "id" bigserial PRIMARY KEY,
  "program_update_id" uuid NOT NULL REFERENCES "program_updates"("id") ON DELETE CASCADE,
  "user_id" text DEFAULT '' NOT NULL,
  "push_token_id" uuid NOT NULL REFERENCES "push_tokens"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'queued' NOT NULL,
  "expo_ticket_id" text,
  "error_code" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "program_update_deliveries_status_check"
    CHECK ("status" IN ('queued','sent','failed','skipped')),
  CONSTRAINT "program_update_deliveries_update_token_key" UNIQUE ("program_update_id", "push_token_id")
);
CREATE INDEX IF NOT EXISTS "program_update_deliveries_user_idx"
  ON "program_update_deliveries" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "program_update_deliveries_update_idx"
  ON "program_update_deliveries" ("program_update_id");
