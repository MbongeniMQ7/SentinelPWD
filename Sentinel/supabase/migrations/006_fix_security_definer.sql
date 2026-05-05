-- ============================================================
-- FIX: SECURITY DEFINER functions must declare SET search_path
--
-- Supabase (2024+) raises "Database error querying schema" when
-- a SECURITY DEFINER function has a mutable search_path.
-- Recreate handle_new_user with SET search_path = '' and fully
-- qualified table names to satisfy the security check.
--
-- Run in:  Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- Fix the new-user trigger (the only SECURITY DEFINER fn we have)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''            -- prevents schema-injection, fixes auth error
as $$
begin
  insert into public.profiles (id, full_name, role, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'role',
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;   -- idempotent: don't fail if profile already exists
  return new;
end;
$$;

-- Re-wire the trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tell PostgREST to reload its schema cache (fixes any "relationship not found" errors)
notify pgrst, 'reload schema';
