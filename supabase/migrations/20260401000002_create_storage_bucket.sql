-- Create the project-pdfs storage bucket and access policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-pdfs', 'project-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their org's projects
CREATE POLICY storage_project_pdfs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-pdfs'
  );

-- Allow authenticated users to read files from their org's projects
CREATE POLICY storage_project_pdfs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-pdfs'
  );

-- Allow authenticated users to update their uploads
CREATE POLICY storage_project_pdfs_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-pdfs'
  );

-- Allow authenticated users to delete their uploads
CREATE POLICY storage_project_pdfs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-pdfs'
  );
