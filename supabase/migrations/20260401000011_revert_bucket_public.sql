-- Revert: bucket project-pdfs should be private (access controlled by RLS policies)
UPDATE storage.buckets SET public = false WHERE id = 'project-pdfs';
