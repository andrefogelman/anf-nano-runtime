-- 20260401000020_dwg_support.sql
-- DWG/DXF pipeline: block mappings, layer mappings, file_type expansion

-- ── ob_block_mappings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ob_block_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES ob_organizations(id) ON DELETE CASCADE,
  block_name text NOT NULL,
  componente text NOT NULL,
  disciplina text NOT NULL CHECK (disciplina IN ('arq', 'est', 'hid', 'ele', 'geral')),
  unidade text NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, block_name)
);

CREATE INDEX IF NOT EXISTS idx_ob_block_mappings_org ON ob_block_mappings(org_id);

-- ── ob_layer_mappings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ob_layer_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES ob_organizations(id) ON DELETE CASCADE,
  layer_name text NOT NULL,
  disciplina text NOT NULL CHECK (disciplina IN ('arq', 'est', 'hid', 'ele', 'cotas', 'anotacoes', 'ignorar')),
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, layer_name)
);

CREATE INDEX IF NOT EXISTS idx_ob_layer_mappings_org ON ob_layer_mappings(org_id);

-- ── Expand file_type CHECK to include 'dxf' ──────────────────────────────────

ALTER TABLE ob_project_files DROP CONSTRAINT IF EXISTS ob_project_files_file_type_check;
ALTER TABLE ob_project_files ADD CONSTRAINT ob_project_files_file_type_check
  CHECK (file_type IN ('pdf', 'dwg', 'dxf', 'xlsx'));

-- ── RLS: ob_block_mappings ────────────────────────────────────────────────────

ALTER TABLE ob_block_mappings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_block_mappings_select') THEN
    CREATE POLICY ob_block_mappings_select ON ob_block_mappings
      FOR SELECT USING (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_block_mappings_insert') THEN
    CREATE POLICY ob_block_mappings_insert ON ob_block_mappings
      FOR INSERT WITH CHECK (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_block_mappings_update') THEN
    CREATE POLICY ob_block_mappings_update ON ob_block_mappings
      FOR UPDATE USING (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_block_mappings_delete') THEN
    CREATE POLICY ob_block_mappings_delete ON ob_block_mappings
      FOR DELETE USING (
        org_id IN (
          SELECT org_id FROM ob_org_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

-- ── RLS: ob_layer_mappings ────────────────────────────────────────────────────

ALTER TABLE ob_layer_mappings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_layer_mappings_select') THEN
    CREATE POLICY ob_layer_mappings_select ON ob_layer_mappings
      FOR SELECT USING (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_layer_mappings_insert') THEN
    CREATE POLICY ob_layer_mappings_insert ON ob_layer_mappings
      FOR INSERT WITH CHECK (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_layer_mappings_update') THEN
    CREATE POLICY ob_layer_mappings_update ON ob_layer_mappings
      FOR UPDATE USING (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_layer_mappings_delete') THEN
    CREATE POLICY ob_layer_mappings_delete ON ob_layer_mappings
      FOR DELETE USING (
        org_id IN (
          SELECT org_id FROM ob_org_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
