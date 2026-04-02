-- Fix: "Admin can upload any avatar" policy references auth.users directly,
-- causing "permission denied for table users" for ALL storage inserts.
-- Replace with auth.jwt() to avoid needing SELECT on auth.users.

DROP POLICY IF EXISTS "Admin can upload any avatar" ON storage.objects;
CREATE POLICY "Admin can upload any avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars-external'
    AND EXISTS (
      SELECT 1 FROM sec_users_groups
      WHERE sec_users_groups.login = auth.jwt()->>'email'
        AND sec_users_groups.group_id = 1
    )
  );

-- Same issue exists for Admin update/delete policies
DROP POLICY IF EXISTS "Admin can update any avatar" ON storage.objects;
CREATE POLICY "Admin can update any avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars-external'
    AND EXISTS (
      SELECT 1 FROM sec_users_groups
      WHERE sec_users_groups.login = auth.jwt()->>'email'
        AND sec_users_groups.group_id = 1
    )
  );

DROP POLICY IF EXISTS "Admin can delete any avatar" ON storage.objects;
CREATE POLICY "Admin can delete any avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars-external'
    AND EXISTS (
      SELECT 1 FROM sec_users_groups
      WHERE sec_users_groups.login = auth.jwt()->>'email'
        AND sec_users_groups.group_id = 1
    )
  );

-- Cleanup debug functions
DROP FUNCTION IF EXISTS public.debug_storage_policies();
DROP FUNCTION IF EXISTS public.debug_storage_rls();
DROP FUNCTION IF EXISTS public.debug_storage_deep();
DROP FUNCTION IF EXISTS public.debug_auth_context();
DROP FUNCTION IF EXISTS public.debug_storage_buckets_policies();
DROP FUNCTION IF EXISTS public.test_storage_insert();
