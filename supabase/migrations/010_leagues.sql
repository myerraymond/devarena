-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- League memberships table
CREATE TABLE IF NOT EXISTS league_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('diamond', 'platinum', 'gold', 'silver', 'bronze')),
  end_rank INTEGER,
  promoted BOOLEAN,
  relegated BOOLEAN,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, season_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_league_memberships_user_id ON league_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_league_memberships_season_id ON league_memberships(season_id);
CREATE INDEX IF NOT EXISTS idx_league_memberships_tier ON league_memberships(tier);
CREATE INDEX IF NOT EXISTS idx_seasons_is_active ON seasons(is_active);

-- Enable RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_memberships ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Seasons are publicly readable"
  ON seasons FOR SELECT
  USING (true);

CREATE POLICY "League memberships are publicly readable"
  ON league_memberships FOR SELECT
  USING (true);

-- Service role insert/update policies
CREATE POLICY "Service role can manage seasons"
  ON seasons FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage league memberships"
  ON league_memberships FOR ALL
  USING (true)
  WITH CHECK (true);
