-- ═══════════════════════════════════════════════════════════
-- Production RLS Hardening
-- Ensures Row Level Security is enabled and policies are
-- correct on all tables.
-- ═══════════════════════════════════════════════════════════

-- ── users ──────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Service role can delete users" ON public.users;

-- Anyone can read public users
CREATE POLICY "Public users are viewable by everyone"
  ON public.users FOR SELECT
  USING (is_public = true);

-- Users can only update their own row (requires auth)
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT is service role only (no policy = denied for anon/authenticated)
-- DELETE is service role only (no policy = denied for anon/authenticated)

-- ── stats_snapshots ────────────────────────────────────────
ALTER TABLE public.stats_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stats are publicly readable" ON public.stats_snapshots;

CREATE POLICY "Stats are publicly readable"
  ON public.stats_snapshots FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: service role only (cron job)

-- ── feed_events ────────────────────────────────────────────
ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feed events are publicly readable" ON public.feed_events;

CREATE POLICY "Feed events are publicly readable"
  ON public.feed_events FOR SELECT
  USING (true);

-- INSERT/DELETE: service role only

-- ── seasons ────────────────────────────────────────────────
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seasons are publicly readable" ON public.seasons;

CREATE POLICY "Seasons are publicly readable"
  ON public.seasons FOR SELECT
  USING (true);

-- INSERT/UPDATE: service role only (cron)

-- ── league_memberships ─────────────────────────────────────
ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League memberships are publicly readable" ON public.league_memberships;

CREATE POLICY "League memberships are publicly readable"
  ON public.league_memberships FOR SELECT
  USING (true);

-- INSERT/UPDATE: service role only (cron)

-- ── teams ──────────────────────────────────────────────────
-- (tables kept but UI removed — still secure them)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are publicly readable" ON public.teams;

CREATE POLICY "Teams are publicly readable"
  ON public.teams FOR SELECT
  USING (is_private = false);

-- ── team_members ───────────────────────────────────────────
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members are readable by team members" ON public.team_members;

CREATE POLICY "Team members are readable by team members"
  ON public.team_members FOR SELECT
  USING (true);

-- ── waitlist ───────────────────────────────────────────────
-- If the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'waitlist' AND schemaname = 'public') THEN
    ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Waitlist insert only" ON public.waitlist;
    CREATE POLICY "Waitlist insert only"
      ON public.waitlist FOR INSERT
      WITH CHECK (true);
    -- No SELECT for non-service role
  END IF;
END $$;
