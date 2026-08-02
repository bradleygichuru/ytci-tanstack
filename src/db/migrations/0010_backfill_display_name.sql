-- Backfill display_name from the better-auth users table.
-- Fixes 'Anonymous' showing on leaderboards, comments, and story author names
-- for users who signed up before display_name was populated on insert.
UPDATE user_profiles up
SET    display_name = u.name,
       updated_at   = now()
FROM   users u
WHERE  up.user_id = u.id
  AND  up.display_name IS NULL;
