-- Ensure all required columns exist in stats_snapshots
-- This migration is idempotent - it will only add columns if they don't exist

DO $$ 
BEGIN
  -- Builder score columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'week_score'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN week_score INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'month_score'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN month_score INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'week_commits'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN week_commits INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'week_prs'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN week_prs INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'month_commits'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN month_commits INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'month_prs'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN month_prs INTEGER;
  END IF;

  -- JSONB breakdown columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'daily_breakdown'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN daily_breakdown JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'language_breakdown'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN language_breakdown JSONB;
  END IF;

  -- GitHub follower columns (from migration 004)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'github_followers'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN github_followers INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'github_following'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN github_following INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'github_public_repos'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN github_public_repos INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stats_snapshots' AND column_name = 'github_stars'
  ) THEN
    ALTER TABLE stats_snapshots ADD COLUMN github_stars INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_stats_week_score ON stats_snapshots(week_score);
CREATE INDEX IF NOT EXISTS idx_stats_month_score ON stats_snapshots(month_score);
CREATE INDEX IF NOT EXISTS idx_stats_github_followers ON stats_snapshots(github_followers);
CREATE INDEX IF NOT EXISTS idx_stats_github_commits ON stats_snapshots(github_commits);
