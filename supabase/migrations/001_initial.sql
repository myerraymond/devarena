-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wakatime_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  wakatime_access_token TEXT,
  wakatime_refresh_token TEXT,
  is_public BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stats_snapshots table
CREATE TABLE stats_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_total_seconds INTEGER,
  month_total_seconds INTEGER,
  all_time_seconds INTEGER,
  top_language TEXT,
  top_project TEXT,
  daily_average_seconds INTEGER,
  streak_days INTEGER,
  snapshotted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_wakatime_id ON users(wakatime_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_stats_snapshots_user_id ON stats_snapshots(user_id);
CREATE INDEX idx_stats_snapshots_snapshotted_at ON stats_snapshots(snapshotted_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Policy: Anyone can read public profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON users
  FOR SELECT
  USING (is_public = true);

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for stats_snapshots table
-- Policy: Anyone can read stats for public profiles
CREATE POLICY "Public stats are viewable by everyone"
  ON stats_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = stats_snapshots.user_id
      AND users.is_public = true
    )
  );

-- Policy: Users can read their own stats
CREATE POLICY "Users can view own stats"
  ON stats_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own stats
CREATE POLICY "Users can insert own stats"
  ON stats_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own stats
CREATE POLICY "Users can update own stats"
  ON stats_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own stats
CREATE POLICY "Users can delete own stats"
  ON stats_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);
