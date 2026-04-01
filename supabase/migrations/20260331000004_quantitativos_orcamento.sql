-- 004_quantitativos_orcamento.sql
-- Quantity takeoff and budget items

CREATE TABLE IF NOT EXISTS ob_quantitativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES ob_projects(id) ON DELETE CASCADE,
  disciplina text NOT NULL CHECK (disciplina IN ('arq', 'est', 'hid', 'ele', 'geral')),
  item_code text,
  descricao text NOT NULL,
  unidade text NOT NULL,
  quantidade numeric(14,4) NOT NULL,
  calculo_memorial text,
  origem_prancha uuid REFERENCES ob_pdf_pages(id),
  origem_ambiente text,
  confidence numeric(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  needs_review boolean NOT NULL DEFAULT false,
  created_by text,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_quantitativos_project ON ob_quantitativos(project_id);
CREATE INDEX IF NOT EXISTS idx_ob_quantitativos_disciplina ON ob_quantitativos(project_id, disciplina);
CREATE INDEX IF NOT EXISTS idx_ob_quantitativos_needs_review ON ob_quantitativos(needs_review) WHERE needs_review = true;

CREATE TABLE IF NOT EXISTS ob_orcamento_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES ob_projects(id) ON DELETE CASCADE,
  eap_code text NOT NULL,
  eap_level integer NOT NULL CHECK (eap_level BETWEEN 1 AND 3),
  descricao text NOT NULL,
  unidade text,
  quantidade numeric(14,4),
  fonte text CHECK (fonte IN ('sinapi', 'tcpo', 'cotacao', 'mercado')),
  fonte_codigo text,
  fonte_data_base text,
  custo_unitario numeric(14,4),
  custo_material numeric(14,4),
  custo_mao_obra numeric(14,4),
  custo_total numeric(14,4),
  adm_percentual numeric(5,2) DEFAULT 0,
  peso_percentual numeric(5,2),
  curva_abc_classe text CHECK (curva_abc_classe IN ('A', 'B', 'C')),
  quantitativo_id uuid REFERENCES ob_quantitativos(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_orcamento_items_project ON ob_orcamento_items(project_id);
CREATE INDEX IF NOT EXISTS idx_ob_orcamento_items_eap ON ob_orcamento_items(project_id, eap_code);

-- RLS
ALTER TABLE ob_quantitativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_orcamento_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_quantitativos_select') THEN
    CREATE POLICY ob_quantitativos_select ON ob_quantitativos
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_quantitativos_insert') THEN
    CREATE POLICY ob_quantitativos_insert ON ob_quantitativos
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_quantitativos_update') THEN
    CREATE POLICY ob_quantitativos_update ON ob_quantitativos
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_orcamento_items_select') THEN
    CREATE POLICY ob_orcamento_items_select ON ob_orcamento_items
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_orcamento_items_insert') THEN
    CREATE POLICY ob_orcamento_items_insert ON ob_orcamento_items
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_orcamento_items_update') THEN
    CREATE POLICY ob_orcamento_items_update ON ob_orcamento_items
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_orcamento_items_delete') THEN
    CREATE POLICY ob_orcamento_items_delete ON ob_orcamento_items
      FOR DELETE USING (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
