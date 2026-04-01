-- 002_projects_files.sql
-- Projects and uploaded files

CREATE TABLE IF NOT EXISTS ob_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES ob_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  tipo_obra text,
  area_total_m2 numeric(12,2),
  uf text CHECK (char_length(uf) = 2),
  cidade text,
  data_base_sinapi text,
  bdi_percentual numeric(5,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'review', 'done')),
  premissas jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_projects_org ON ob_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_ob_projects_status ON ob_projects(status);

CREATE TABLE IF NOT EXISTS ob_project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES ob_projects(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'dwg', 'xlsx')),
  disciplina text CHECK (disciplina IN ('arq', 'est', 'hid', 'ele', 'memorial')),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'done', 'error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_project_files_project ON ob_project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_ob_project_files_status ON ob_project_files(status);

-- RLS
ALTER TABLE ob_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_project_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_projects_select') THEN
    CREATE POLICY ob_projects_select ON ob_projects
      FOR SELECT USING (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_projects_insert') THEN
    CREATE POLICY ob_projects_insert ON ob_projects
      FOR INSERT WITH CHECK (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_projects_update') THEN
    CREATE POLICY ob_projects_update ON ob_projects
      FOR UPDATE USING (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_projects_delete') THEN
    CREATE POLICY ob_projects_delete ON ob_projects
      FOR DELETE USING (
        org_id IN (
          SELECT org_id FROM ob_org_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_project_files_select') THEN
    CREATE POLICY ob_project_files_select ON ob_project_files
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_project_files_insert') THEN
    CREATE POLICY ob_project_files_insert ON ob_project_files
      FOR INSERT WITH CHECK (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_project_files_update') THEN
    CREATE POLICY ob_project_files_update ON ob_project_files
      FOR UPDATE USING (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_project_files_delete') THEN
    CREATE POLICY ob_project_files_delete ON ob_project_files
      FOR DELETE USING (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
