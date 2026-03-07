-- Feed events table for activity feed
create table feed_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamp with time zone default now()
);

-- Indexes for fast feed queries
create index idx_feed_events_created_at on feed_events (created_at desc);
create index idx_feed_events_user_id on feed_events (user_id);
create index idx_feed_events_event_type on feed_events (event_type);

-- Enable RLS
alter table feed_events enable row level security;

-- Allow anyone to read feed events (public feed)
create policy "Feed events are publicly readable"
  on feed_events for select
  using (true);

-- Only service role can insert
create policy "Service role can insert feed events"
  on feed_events for insert
  with check (true);
