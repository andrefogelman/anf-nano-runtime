-- 003_pdf_pipeline.sql
-- PDF processing pipeline tables

CREATE TABLE IF NOT EXISTS ob_pdf_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES ob_project_files(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  stage text,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_pdf_jobs_file ON ob_pdf_jobs(file_id);
CREATE INDEX IF NOT EXISTS idx_ob_pdf_jobs_status ON ob_pdf_jobs(status);

CREATE TABLE IF NOT EXISTS ob_pdf_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES ob_project_files(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  prancha_id text,
  tipo text,
  text_content text,
  ocr_used boolean NOT NULL DEFAULT false,
  image_path text,
  structured_data jsonb,
  confidence numeric(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  needs_review boolean NOT NULL DEFAULT false,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (file_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_ob_pdf_pages_file ON ob_pdf_pages(file_id);
CREATE INDEX IF NOT EXISTS idx_ob_pdf_pages_needs_review ON ob_pdf_pages(needs_review) WHERE needs_review = true;

-- RLS
ALTER TABLE ob_pdf_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_pdf_pages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_pdf_jobs_select') THEN
    CREATE POLICY ob_pdf_jobs_select ON ob_pdf_jobs
      FOR SELECT USING (
        file_id IN (
          SELECT pf.id FROM ob_project_files pf
          JOIN ob_projects p ON p.id = pf.project_id
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_pdf_jobs_insert') THEN
    CREATE POLICY ob_pdf_jobs_insert ON ob_pdf_jobs
      FOR INSERT WITH CHECK (
        file_id IN (
          SELECT pf.id FROM ob_project_files pf
          JOIN ob_projects p ON p.id = pf.project_id
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_pdf_jobs_update') THEN
    CREATE POLICY ob_pdf_jobs_update ON ob_pdf_jobs
      FOR UPDATE USING (
        file_id IN (
          SELECT pf.id FROM ob_project_files pf
          JOIN ob_projects p ON p.id = pf.project_id
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_pdf_pages_select') THEN
    CREATE POLICY ob_pdf_pages_select ON ob_pdf_pages
      FOR SELECT USING (
        file_id IN (
          SELECT pf.id FROM ob_project_files pf
          JOIN ob_projects p ON p.id = pf.project_id
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_pdf_pages_insert') THEN
    CREATE POLICY ob_pdf_pages_insert ON ob_pdf_pages
      FOR INSERT WITH CHECK (
        file_id IN (
          SELECT pf.id FROM ob_project_files pf
          JOIN ob_projects p ON p.id = pf.project_id
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_pdf_pages_update') THEN
    CREATE POLICY ob_pdf_pages_update ON ob_pdf_pages
      FOR UPDATE USING (
        file_id IN (
          SELECT pf.id FROM ob_project_files pf
          JOIN ob_projects p ON p.id = pf.project_id
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;
