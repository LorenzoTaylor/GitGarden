-- Make github_username and password_hash nullable for OAuth users
ALTER TABLE users ALTER COLUMN github_username DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add github_id for OAuth identification
ALTER TABLE users ADD COLUMN github_id BIGINT UNIQUE;

-- Drop old character columns
ALTER TABLE users DROP COLUMN IF EXISTS current_character;
ALTER TABLE users DROP COLUMN IF EXISTS characters;

-- Add current_outfit_id reference
ALTER TABLE users ADD COLUMN current_outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL;

-- Add user_id to outfits
ALTER TABLE outfits ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
