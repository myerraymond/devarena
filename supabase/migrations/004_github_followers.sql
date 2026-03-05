-- Add GitHub followers and other metrics to stats_snapshots
ALTER TABLE stats_snapshots
  ADD COLUMN github_followers INTEGER,
  ADD COLUMN github_following INTEGER,
  ADD COLUMN github_public_repos INTEGER,
  ADD COLUMN github_stars INTEGER DEFAULT 0;

-- Create index for faster ranking queries
CREATE INDEX idx_stats_github_followers ON stats_snapshots(github_followers);
CREATE INDEX idx_stats_github_commits ON stats_snapshots(github_commits);
