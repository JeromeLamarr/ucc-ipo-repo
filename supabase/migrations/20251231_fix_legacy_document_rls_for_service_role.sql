-- Fix RLS policies for legacy_record_documents to allow service role inserts
-- Service role key should bypass RLS, but we need to make sure policies are correct

-- Drop existing policies that might be blocking service role
DROP POLICY IF EXISTS legacy_record_documents_insert_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_select_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_update_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_delete_policy ON public.legacy_record_documents;

-- Allow admins to insert their own records
CREATE POLICY legacy_record_documents_insert_admin_policy 
  ON public.legacy_record_documents 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    OR auth.uid() IS NULL -- Allow service role
  );

-- Allow admins to select
CREATE POLICY legacy_record_documents_select_admin_policy 
  ON public.legacy_record_documents 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    OR auth.uid() IS NULL -- Allow service role
  );

-- Allow admins to update
CREATE POLICY legacy_record_documents_update_admin_policy 
  ON public.legacy_record_documents 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    OR auth.uid() IS NULL -- Allow service role
  );

-- Allow admins to delete
CREATE POLICY legacy_record_documents_delete_admin_policy 
  ON public.legacy_record_documents 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    OR auth.uid() IS NULL -- Allow service role
  );
