-- The MICE event create/update path writes events.highlights, but no earlier
-- migration created it; production create returned 500.
ALTER TABLE events ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb;
