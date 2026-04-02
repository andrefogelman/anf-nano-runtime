-- Fix: recreate storage policies matching the pattern that works for other buckets
-- (TO authenticated, simple bucket_id check, no auth.role())

DROP POLICY IF EXISTS "project_pdfs_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "project_pdfs_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "project_pdfs_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "project_pdfs_auth_delete" ON storage.objects;

CREATE POLICY "project_pdfs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-pdfs');

CREATE POLICY "project_pdfs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-pdfs');

CREATE POLICY "project_pdfs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-pdfs');

CREATE POLICY "project_pdfs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-pdfs');

-- Cleanup debug function
DROP FUNCTION IF EXISTS public.debug_storage_policies();
