-- ============================================================
-- Run this in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. profiles table -----------------------------------------
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  full_name    text,
  phone        text,
  job_title    text,
  department   text,
  company      text,
  role         text,
  avatar_url   text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

-- 2. Row Level Security -------------------------------------
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Auto-update updated_at ---------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- 4. Auto-create profile on sign-up -------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'role'
  );
  return new;
end;
$$;

-- drop & recreate so it's idempotent
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
