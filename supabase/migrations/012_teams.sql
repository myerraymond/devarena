-- Teams table
create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  avatar_url text,
  created_by uuid references public.users(id) on delete set null,
  is_private boolean not null default true,
  invite_code text unique not null,
  max_members integer not null default 10,
  created_at timestamp with time zone default now()
);

-- Team members table
create table team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text not null default 'member', -- 'owner' | 'member'
  joined_at timestamp with time zone default now(),
  unique (team_id, user_id)
);

-- Indexes
create index idx_teams_slug on teams (slug);
create index idx_teams_invite_code on teams (invite_code);
create index idx_teams_is_private on teams (is_private);
create index idx_team_members_team_id on team_members (team_id);
create index idx_team_members_user_id on team_members (user_id);

-- Enable RLS
alter table teams enable row level security;
alter table team_members enable row level security;

-- Teams: public teams readable by all, private by members only
create policy "Public teams are readable by all"
  on teams for select
  using (is_private = false);

create policy "Private teams readable by members"
  on teams for select
  using (
    is_private = true
    and exists (
      select 1 from team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
    )
  );

-- Allow service role full access (insert is handled via API)
create policy "Service role can manage teams"
  on teams for all
  using (true)
  with check (true);

-- Team members: readable by all (for leaderboards)
create policy "Team members are publicly readable"
  on team_members for select
  using (true);

create policy "Service role can manage team members"
  on team_members for all
  using (true)
  with check (true);
