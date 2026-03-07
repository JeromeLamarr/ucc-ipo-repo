-- Drop the broken RLS policies that use raw subqueries (susceptible to RLS recursion)
DROP POLICY IF EXISTS "Allow authenticated read" ON certificate_signatories;
DROP POLICY IF EXISTS "Allow admin update" ON certificate_signatories;
DROP POLICY IF EXISTS "Allow admin insert" ON certificate_signatories;

-- Recreate using the SECURITY DEFINER is_admin() function (same pattern as all other admin tables)
CREATE POLICY "cert_sig_read"
  ON certificate_signatories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cert_sig_insert"
  ON certificate_signatories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "cert_sig_update"
  ON certificate_signatories FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "cert_sig_delete"
  ON certificate_signatories FOR DELETE
  TO authenticated
  USING (public.is_admin());
