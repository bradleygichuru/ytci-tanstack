ALTER TABLE user_profiles ADD COLUMN display_name text;

CREATE TABLE IF NOT EXISTS story_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    author_id text NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES story_comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'deleted')),
    like_count INTEGER DEFAULT 0,
    moderation_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS story_comments_story_idx ON story_comments (story_id);
CREATE INDEX IF NOT EXISTS story_comments_parent_idx ON story_comments (parent_id);

CREATE TABLE IF NOT EXISTS comment_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES story_comments(id) ON DELETE CASCADE,
    interaction_type text NOT NULL CHECK (interaction_type = 'like'),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (user_id, comment_id, interaction_type)
);
CREATE INDEX IF NOT EXISTS comment_interactions_comment_idx ON comment_interactions (comment_id);
