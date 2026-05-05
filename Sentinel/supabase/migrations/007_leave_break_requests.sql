-- ============================================================
-- LEAVE & BREAK REQUESTS — Run AFTER 001_profiles.sql
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- ── Leave Requests ────────────────────────────────────────────
create table if not exists public.leave_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('sick', 'annual', 'emergency', 'other')),
  duration_hours numeric(5,1) not null default 1,
  reason         text,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  reviewed_by    uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists leave_requests_user_id_idx
  on public.leave_requests (user_id, created_at desc);

alter table public.leave_requests enable row level security;

create policy "Users can read own leave requests"
  on public.leave_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert own leave requests"
  on public.leave_requests for insert
  with check (auth.uid() = user_id);

create policy "Admins and owners can read all leave requests"
  on public.leave_requests for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'owner')
    )
  );

create policy "Admins and owners can update leave requests"
  on public.leave_requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'owner')
    )
  );

-- Auto-update updated_at
create trigger leave_requests_updated_at
  before update on public.leave_requests
  for each row execute procedure public.set_updated_at();


-- ── Break Requests ────────────────────────────────────────────
create table if not exists public.break_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  type             text not null check (type in ('rest', 'fatigue', 'meal')),
  duration_minutes integer not null default 15
                     check (duration_minutes in (10, 15, 20, 30)),
  fatigue_score    integer check (fatigue_score >= 0 and fatigue_score <= 100),
  status           text not null default 'requested'
                     check (status in ('requested', 'active', 'completed', 'cancelled')),
  started_at       timestamptz,
  ended_at         timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists break_requests_user_id_idx
  on public.break_requests (user_id, created_at desc);

alter table public.break_requests enable row level security;

create policy "Users can read own break requests"
  on public.break_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert own break requests"
  on public.break_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can update own break requests"
  on public.break_requests for update
  using (auth.uid() = user_id);

create policy "Admins and owners can read all break requests"
  on public.break_requests for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'owner')
    )
  );

notify pgrst, 'reload schema';
