-- Fix legacy_record_documents RLS policies to allow frontend reads
-- The issue is admins need to be able to SELECT records they generate

-- Drop all policies first
DROP POLICY IF EXISTS legacy_record_documents_select_admin_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_select_policy ON public.legacy_record_documents;

-- Create a proper SELECT policy for admins
CREATE POLICY legacy_record_documents_admin_select 
  ON public.legacy_record_documents 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Verify other policies exist
-- INSERT
DROP POLICY IF EXISTS legacy_record_documents_insert_admin_policy ON public.legacy_record_documents;
CREATE POLICY legacy_record_documents_admin_insert 
  ON public.legacy_record_documents 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    OR auth.uid() IS NULL
  );

-- UPDATE  
DROP POLICY IF EXISTS legacy_record_documents_update_admin_policy ON public.legacy_record_documents;
CREATE POLICY legacy_record_documents_admin_update 
  ON public.legacy_record_documents 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    OR auth.uid() IS NULL
  );

-- DELETE
DROP POLICY IF EXISTS legacy_record_documents_delete_admin_policy ON public.legacy_record_documents;
CREATE POLICY legacy_record_documents_admin_delete 
  ON public.legacy_record_documents 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    OR auth.uid() IS NULL
  );
