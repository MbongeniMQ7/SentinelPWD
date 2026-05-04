-- ============================================================
-- FATIGUE ALERTS TABLE — Run in Supabase Dashboard SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

create table if not exists public.fatigue_alerts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  kind           text not null check (kind in ('worker', 'manager')),
  level          text not null check (level in ('moderate', 'high')),
  score          integer not null check (score >= 0 and score <= 100),
  message        text not null,
  acknowledged   boolean not null default false,
  fired_at       timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index if not exists fatigue_alerts_user_id_idx
  on public.fatigue_alerts (user_id, fired_at desc);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table public.fatigue_alerts enable row level security;

-- Users can read their own alerts
create policy "Users can read own alerts"
  on public.fatigue_alerts for select
  using (auth.uid() = user_id);

-- Users can insert their own alerts
create policy "Users can insert own alerts"
  on public.fatigue_alerts for insert
  with check (auth.uid() = user_id);

-- Users can acknowledge (update) their own alerts
create policy "Users can update own alerts"
  on public.fatigue_alerts for update
  using (auth.uid() = user_id);

-- Admins and owners can read all alerts
create policy "Admins and owners can read all alerts"
  on public.fatigue_alerts for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'owner')
    )
  );
