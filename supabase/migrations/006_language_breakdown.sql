-- Add language breakdown to stats_snapshots
ALTER TABLE stats_snapshots
  ADD COLUMN language_breakdown JSONB;
