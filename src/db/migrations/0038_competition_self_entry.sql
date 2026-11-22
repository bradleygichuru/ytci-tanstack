-- Competition self-entry (map #18, task #41).
--
-- Additive. Entrants create their own competition entry from a published
-- repository entry, so the API records guardian consent and a soft withdrawal.
-- Withdrawal frees the category and the work for a later re-entry, so the two
-- entrant-facing unique indexes become partial.

ALTER TABLE competition_entries
    ADD COLUMN IF NOT EXISTS guardian_consent boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS guardian_consent_at timestamp,
    ADD COLUMN IF NOT EXISTS withdrawn_at timestamp,
    ADD COLUMN IF NOT EXISTS withdrawn_by text;

ALTER TABLE competition_entries
    ADD CONSTRAINT competition_entries_withdrawn_by_users_id_fk
    FOREIGN KEY (withdrawn_by) REFERENCES users(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS competition_entries_edition_category_lead_idx;
DROP INDEX IF EXISTS competition_entries_edition_category_repository_idx;

CREATE UNIQUE INDEX IF NOT EXISTS competition_entries_edition_category_lead_active_idx
    ON competition_entries (edition_id, category_id, lead_user_id)
    WHERE withdrawn_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS competition_entries_edition_category_repository_active_idx
    ON competition_entries (edition_id, category_id, repository_entry_id)
    WHERE withdrawn_at IS NULL;

CREATE INDEX IF NOT EXISTS competition_entries_lead_edition_active_idx
    ON competition_entries (lead_user_id, edition_id)
    WHERE withdrawn_at IS NULL;
