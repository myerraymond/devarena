-- Add builder score fields to stats_snapshots
ALTER TABLE stats_snapshots
  ADD COLUMN week_score INTEGER,
  ADD COLUMN month_score INTEGER,
  ADD COLUMN week_commits INTEGER,
  ADD COLUMN week_prs INTEGER,
  ADD COLUMN month_commits INTEGER,
  ADD COLUMN month_prs INTEGER,
  ADD COLUMN daily_breakdown JSONB;

-- Create index for faster ranking queries
CREATE INDEX idx_stats_week_score ON stats_snapshots(week_score);
CREATE INDEX idx_stats_month_score ON stats_snapshots(month_score);
