-- ============================================================
-- BUG REPORTS — ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can submit a bug report on their own behalf
CREATE POLICY "bug_reports_insert_own"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reported_by_profile_id = (
      SELECT profile_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

-- Users/Managers can read their own submitted reports
CREATE POLICY "bug_reports_select_own"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (
    reported_by_profile_id = (
      SELECT profile_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

-- Owners can read all bug reports (for the issues dashboard)
CREATE POLICY "bug_reports_select_owner"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid() AND role = 'OWNER'
    )
  );

-- Owners can update bug reports (e.g. resolve/close them)
CREATE POLICY "bug_reports_update_owner"
  ON bug_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid() AND role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid() AND role = 'OWNER'
    )
  );
