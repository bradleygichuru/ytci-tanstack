-- The events API reads and filters columns no earlier migration created, so
-- fresh databases and production both failed on /v1/public/events.
ALTER TABLE events ADD COLUMN IF NOT EXISTS county_gid integer REFERENCES kenya_counties(gid);
ALTER TABLE events ADD COLUMN IF NOT EXISTS author_ref text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS editorial_theme text;
CREATE INDEX IF NOT EXISTS events_county_gid_idx ON events (county_gid);
