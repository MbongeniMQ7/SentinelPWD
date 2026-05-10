-- ============================================================
-- Migration 010: Add needs_password_reset flag to profiles
-- Used to prompt new users added by admin/owner to set their
-- own password on first login.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS needs_password_reset boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.needs_password_reset IS
  'When true the user must set a new password before using the app. Set on account creation by admin/owner.';
