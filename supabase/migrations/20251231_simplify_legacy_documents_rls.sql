-- Simplify RLS policies for legacy_record_documents - admins need full access
-- Drop ALL existing policies and create clean ones

-- Drop all existing policies
DROP POLICY IF EXISTS legacy_record_documents_admin_select ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_admin_insert ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_admin_update ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_admin_delete ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_select_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_insert_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_update_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_delete_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_select_admin_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_insert_admin_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_update_admin_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_delete_admin_policy ON public.legacy_record_documents;

-- Create clean, simple policies that work
-- SELECT: Admins can read all records
CREATE POLICY legacy_records_docs_select 
  ON public.legacy_record_documents 
  FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

-- INSERT: Admins can insert (via frontend) or service role can insert (via edge functions)
CREATE POLICY legacy_records_docs_insert 
  ON public.legacy_record_documents 
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.uid() IS NULL
  );

-- UPDATE: Admins can update
CREATE POLICY legacy_records_docs_update 
  ON public.legacy_record_documents 
  FOR UPDATE 
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.uid() IS NULL)
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.uid() IS NULL);

-- DELETE: Admins can delete
CREATE POLICY legacy_records_docs_delete 
  ON public.legacy_record_documents 
  FOR DELETE 
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.uid() IS NULL);
