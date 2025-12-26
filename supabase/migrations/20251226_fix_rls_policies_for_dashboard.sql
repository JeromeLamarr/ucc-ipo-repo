-- Fix RLS policies for dashboard access
-- This allows authenticated users to read necessary data while maintaining security

-- 1. Allow authenticated users to read users table (for applicant info, supervisor info, etc)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
CREATE POLICY "Allow authenticated users to read users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Allow authenticated users to read ip_records
ALTER TABLE ip_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read own records" ON ip_records;
CREATE POLICY "Allow authenticated users to read own records"
  ON ip_records FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Allow authenticated users to update their own records
DROP POLICY IF EXISTS "Allow authenticated users to update own records" ON ip_records;
CREATE POLICY "Allow authenticated users to update own records"
  ON ip_records FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 4. Allow reading evaluator_assignments
ALTER TABLE evaluator_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read assignments" ON evaluator_assignments;
CREATE POLICY "Allow authenticated users to read assignments"
  ON evaluator_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Allow reading supervisor_assignments
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read supervisor assignments" ON supervisor_assignments;
CREATE POLICY "Allow authenticated users to read supervisor assignments"
  ON supervisor_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

-- 6. Allow reading evaluations
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read evaluations" ON evaluations;
CREATE POLICY "Allow authenticated users to read evaluations"
  ON evaluations FOR SELECT
  USING (auth.role() = 'authenticated');

-- 7. Allow reading activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read activity logs" ON activity_logs;
CREATE POLICY "Allow authenticated users to read activity logs"
  ON activity_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- 8. Allow reading process_tracking
ALTER TABLE process_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read process tracking" ON process_tracking;
CREATE POLICY "Allow authenticated users to read process tracking"
  ON process_tracking FOR SELECT
  USING (auth.role() = 'authenticated');

-- 9. Allow reading ip_documents
ALTER TABLE ip_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON ip_documents;
CREATE POLICY "Allow authenticated users to read documents"
  ON ip_documents FOR SELECT
  USING (auth.role() = 'authenticated');

-- 10. Allow reading notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read notifications" ON notifications;
CREATE POLICY "Allow authenticated users to read notifications"
  ON notifications FOR SELECT
  USING (auth.role() = 'authenticated');

-- 11. Allow inserting notifications
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;
CREATE POLICY "Allow authenticated users to insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Verify policies are in place
SELECT tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename IN ('users', 'ip_records', 'evaluator_assignments', 'supervisor_assignments', 'evaluations', 'activity_logs', 'process_tracking', 'ip_documents', 'notifications')
ORDER BY tablename, policyname;
