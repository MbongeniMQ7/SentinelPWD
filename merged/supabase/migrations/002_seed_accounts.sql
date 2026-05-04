-- ============================================================
-- SEED ACCOUNTS — Run AFTER 001_profiles.sql
-- Dashboard → SQL Editor → New query → paste → Run
--
-- Creates 2 Admin accounts and 2 Owner accounts.
-- Passwords are set below — change them before going live.
--
--  Admin accounts:
--    admin.one@sentinelai.com   / Admin@Sentinel1
--    admin.two@sentinelai.com   / Admin@Sentinel2
--
--  Owner accounts:
--    owner.one@sentinelai.com   / Owner@Sentinel1
--    owner.two@sentinelai.com   / Owner@Sentinel2
-- ============================================================

-- Enable pgcrypto for password hashing (safe to run multiple times)
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------
-- Helper: insert a verified user + identity + profile in one shot
-- ----------------------------------------------------------------
do $$
declare
  uid1 uuid := gen_random_uuid();
  uid2 uuid := gen_random_uuid();
  uid3 uuid := gen_random_uuid();
  uid4 uuid := gen_random_uuid();
begin

  -- ============================================================
  -- ADMIN 1 — admin.one@sentinelai.com  /  Admin@Sentinel1
  -- ============================================================
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  ) values (
    uid1,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin.one@sentinelai.com',
    crypt('Admin@Sentinel1', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin","full_name":"Admin One"}',
    false,
    now(),
    now()
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    uid1,
    'admin.one@sentinelai.com',
    jsonb_build_object('sub', uid1::text, 'email', 'admin.one@sentinelai.com'),
    'email',
    now(),
    now(),
    now()
  ) on conflict do nothing;

  insert into public.profiles (id, full_name, role)
  values (uid1, 'Admin One', 'admin')
  on conflict (id) do nothing;

  -- ============================================================
  -- ADMIN 2 — admin.two@sentinelai.com  /  Admin@Sentinel2
  -- ============================================================
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) values (
    uid2,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin.two@sentinelai.com',
    crypt('Admin@Sentinel2', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin","full_name":"Admin Two"}',
    false,
    now(),
    now()
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    uid2,
    'admin.two@sentinelai.com',
    jsonb_build_object('sub', uid2::text, 'email', 'admin.two@sentinelai.com'),
    'email',
    now(),
    now(),
    now()
  ) on conflict do nothing;

  insert into public.profiles (id, full_name, role)
  values (uid2, 'Admin Two', 'admin')
  on conflict (id) do nothing;

  -- ============================================================
  -- OWNER 1 — owner.one@sentinelai.com  /  Owner@Sentinel1
  -- ============================================================
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) values (
    uid3,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner.one@sentinelai.com',
    crypt('Owner@Sentinel1', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"owner","full_name":"Owner One"}',
    false,
    now(),
    now()
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    uid3,
    'owner.one@sentinelai.com',
    jsonb_build_object('sub', uid3::text, 'email', 'owner.one@sentinelai.com'),
    'email',
    now(),
    now(),
    now()
  ) on conflict do nothing;

  insert into public.profiles (id, full_name, role)
  values (uid3, 'Owner One', 'owner')
  on conflict (id) do nothing;

  -- ============================================================
  -- OWNER 2 — owner.two@sentinelai.com  /  Owner@Sentinel2
  -- ============================================================
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) values (
    uid4,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner.two@sentinelai.com',
    crypt('Owner@Sentinel2', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"owner","full_name":"Owner Two"}',
    false,
    now(),
    now()
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    uid4,
    'owner.two@sentinelai.com',
    jsonb_build_object('sub', uid4::text, 'email', 'owner.two@sentinelai.com'),
    'email',
    now(),
    now(),
    now()
  ) on conflict do nothing;

  insert into public.profiles (id, full_name, role)
  values (uid4, 'Owner Two', 'owner')
  on conflict (id) do nothing;

end $$;
