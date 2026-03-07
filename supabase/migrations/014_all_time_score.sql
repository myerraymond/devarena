-- Add all_time_score column for cumulative builder score tracking
ALTER TABLE stats_snapshots
  ADD COLUMN IF NOT EXISTS all_time_score INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stats_all_time_score ON stats_snapshots(all_time_score DESC);
