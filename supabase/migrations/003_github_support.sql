-- Add GitHub fields to users table
ALTER TABLE users 
  ADD COLUMN github_username TEXT UNIQUE,
  ADD COLUMN github_access_token TEXT,
  ADD COLUMN wakatime_connected BOOLEAN DEFAULT false;

-- Make wakatime_id nullable since GitHub users won't have it initially
ALTER TABLE users 
  ALTER COLUMN wakatime_id DROP NOT NULL;

-- Make username nullable and allow GitHub users without WakaTime username
ALTER TABLE users 
  ALTER COLUMN username DROP NOT NULL;

-- Add GitHub-specific stats to stats_snapshots
ALTER TABLE stats_snapshots
  ADD COLUMN github_commits INTEGER,
  ADD COLUMN github_streak_days INTEGER,
  ADD COLUMN github_top_language TEXT;

-- Create index for GitHub username lookups
CREATE INDEX idx_users_github_username ON users(github_username);
