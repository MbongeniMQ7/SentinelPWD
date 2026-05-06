-- ============================================================
-- Seed: Default SentinelAI Owner Account
-- Username: SentinelAI  |  Password: 1234
-- ============================================================
-- This creates the Supabase Auth user and a matching profiles row.
-- Safe to run multiple times (idempotent via ON CONFLICT).
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
  v_email   text := 'sentinelai@sentinelai.global';
  v_username text := 'SentinelAI';
BEGIN
  -- Check if auth user already exists by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  -- Create auth user if missing
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt('1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Upsert profile row
  INSERT INTO profiles (
    auth_user_id,
    username,
    first_name,
    last_name,
    email,
    role,
    status
  ) VALUES (
    v_user_id,
    v_username,
    'SentinelAI',
    'Owner',
    v_email,
    'OWNER',
    'ACTIVE'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET username   = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        role       = EXCLUDED.role,
        status     = EXCLUDED.status;

END $$;
