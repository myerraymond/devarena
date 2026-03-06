-- Add contribution tracking fields
ALTER TABLE stats_snapshots
  ADD COLUMN IF NOT EXISTS week_pr_reviews INTEGER,
  ADD COLUMN IF NOT EXISTS week_issues INTEGER,
  ADD COLUMN IF NOT EXISTS week_contributions INTEGER,
  ADD COLUMN IF NOT EXISTS month_pr_reviews INTEGER,
  ADD COLUMN IF NOT EXISTS month_issues INTEGER,
  ADD COLUMN IF NOT EXISTS month_contributions INTEGER,
  ADD COLUMN IF NOT EXISTS all_time_contributions INTEGER;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stats_week_contributions ON stats_snapshots(week_contributions DESC);
CREATE INDEX IF NOT EXISTS idx_stats_month_contributions ON stats_snapshots(month_contributions DESC);
