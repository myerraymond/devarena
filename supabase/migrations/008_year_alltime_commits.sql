-- Add year and all-time commit tracking
ALTER TABLE stats_snapshots
  ADD COLUMN IF NOT EXISTS year_commits INTEGER,
  ADD COLUMN IF NOT EXISTS all_time_commits INTEGER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stats_year_commits ON stats_snapshots(year_commits DESC);
CREATE INDEX IF NOT EXISTS idx_stats_all_time_commits ON stats_snapshots(all_time_commits DESC);
