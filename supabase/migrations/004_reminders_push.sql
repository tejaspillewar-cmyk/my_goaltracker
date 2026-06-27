-- ============================================================================
-- Reminders table
-- ============================================================================
create table if not exists public.reminders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  text          text not null check (char_length(text) between 1 and 200),
  reminder_time time not null,         -- e.g. '09:00:00'
  enabled       boolean not null default true,
  created_at    timestamptz default now()
);

alter table public.reminders enable row level security;

create policy "reminders: users manage own"
  on public.reminders for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Push subscriptions table (one row per user — upsert on subscribe)
-- ============================================================================
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  subscription jsonb not null,          -- full PushSubscription JSON
  created_at   timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subs: users manage own"
  on public.push_subscriptions for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can read all push_subscriptions to send notifications
create policy "push_subs: service role read all"
  on public.push_subscriptions for select
  to service_role
  using (true);
