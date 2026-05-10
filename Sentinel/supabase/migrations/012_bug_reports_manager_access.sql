-- ============================================================
-- BUG REPORTS — MANAGER COMPANY ACCESS
-- ============================================================

DROP POLICY IF EXISTS "bug_reports_select_manager_company" ON bug_reports;
CREATE POLICY "bug_reports_select_manager_company"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role = 'MANAGER'
        AND company_id IS NOT NULL
        AND company_id = bug_reports.company_id
    )
  );

DROP POLICY IF EXISTS "bug_reports_update_manager_company" ON bug_reports;
CREATE POLICY "bug_reports_update_manager_company"
  ON bug_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role = 'MANAGER'
        AND company_id IS NOT NULL
        AND company_id = bug_reports.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role = 'MANAGER'
        AND company_id IS NOT NULL
        AND company_id = bug_reports.company_id
    )
  );
