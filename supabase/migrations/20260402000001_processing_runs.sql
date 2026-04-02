-- Processing runs: stores each AI extraction attempt per file
CREATE TABLE IF NOT EXISTS ob_processing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES ob_projects(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES ob_project_files(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  summary text,
  items jsonb NOT NULL DEFAULT '[]',
  needs_review jsonb NOT NULL DEFAULT '[]',
  raw_response jsonb,
  pages_processed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'done' CHECK (status IN ('processing', 'done', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_processing_runs_file ON ob_processing_runs(file_id);
CREATE INDEX IF NOT EXISTS idx_ob_processing_runs_project ON ob_processing_runs(project_id);

-- RLS
ALTER TABLE ob_processing_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_processing_runs_select') THEN
    CREATE POLICY ob_processing_runs_select ON ob_processing_runs
      FOR SELECT USING (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_processing_runs_insert') THEN
    CREATE POLICY ob_processing_runs_insert ON ob_processing_runs
      FOR INSERT WITH CHECK (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Also allow service role (edge functions)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_processing_runs_service') THEN
    CREATE POLICY ob_processing_runs_service ON ob_processing_runs
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
