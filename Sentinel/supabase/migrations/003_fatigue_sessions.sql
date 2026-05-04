-- ============================================================
-- FATIGUE SESSIONS TABLE — Run AFTER 001_profiles.sql
-- Dashboard → SQL Editor → New query → paste → Run
--
-- Stores each terminated monitoring session so the dashboard
-- can show real historical scores and trend data.
-- ============================================================

create table if not exists public.fatigue_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  score            integer not null check (score >= 0 and score <= 100),
  level            text not null check (level in ('low', 'moderate', 'high')),
  blink_rate       numeric(6,2) not null default 0,
  eye_closure      numeric(6,4) not null default 0,
  focus            numeric(6,4) not null default 0,
  duration_seconds integer not null default 0,
  trend            integer[] not null default '{}',
  terminated_at    timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- Index for fast per-user history queries
create index if not exists fatigue_sessions_user_id_idx
  on public.fatigue_sessions (user_id, terminated_at desc);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table public.fatigue_sessions enable row level security;

-- Users can only read their own sessions
create policy "Users can read own sessions"
  on public.fatigue_sessions
  for select
  using (auth.uid() = user_id);

-- Users can insert their own sessions
create policy "Users can insert own sessions"
  on public.fatigue_sessions
  for insert
  with check (auth.uid() = user_id);

-- Admins and owners can read all sessions (for workforce overview)
create policy "Admins and owners can read all sessions"
  on public.fatigue_sessions
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'owner')
    )
  );
