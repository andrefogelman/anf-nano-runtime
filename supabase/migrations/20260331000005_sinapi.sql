-- 005_sinapi.sql
-- SINAPI cost database (public read-only) + market quotes (org-scoped)

-- Enable trigram extension for fuzzy search (must come before the index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS ob_sinapi_composicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  descricao text NOT NULL,
  unidade text NOT NULL,
  uf text NOT NULL CHECK (char_length(uf) = 2),
  data_base text NOT NULL,
  custo_com_desoneracao numeric(14,4),
  custo_sem_desoneracao numeric(14,4),
  tipo text NOT NULL CHECK (tipo IN ('composicao', 'insumo')),
  classe text CHECK (classe IN ('material', 'mao_obra', 'equipamento')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_sinapi_codigo ON ob_sinapi_composicoes(codigo);
CREATE INDEX IF NOT EXISTS idx_ob_sinapi_uf_data ON ob_sinapi_composicoes(uf, data_base);
CREATE INDEX IF NOT EXISTS idx_ob_sinapi_descricao_trgm ON ob_sinapi_composicoes USING gin (descricao gin_trgm_ops);

CREATE TABLE IF NOT EXISTS ob_sinapi_composicao_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composicao_id uuid NOT NULL REFERENCES ob_sinapi_composicoes(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES ob_sinapi_composicoes(id) ON DELETE CASCADE,
  coeficiente numeric(14,6) NOT NULL,
  UNIQUE (composicao_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_ob_sinapi_insumos_comp ON ob_sinapi_composicao_insumos(composicao_id);

CREATE TABLE IF NOT EXISTS ob_cotacoes_mercado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES ob_projects(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  unidade text NOT NULL,
  fornecedor text,
  valor_unitario numeric(14,4) NOT NULL,
  validade date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_cotacoes_project ON ob_cotacoes_mercado(project_id);

-- RLS: SINAPI tables are public read-only, cotacoes are org-scoped
ALTER TABLE ob_sinapi_composicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_sinapi_composicao_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_cotacoes_mercado ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_sinapi_public_read') THEN
    CREATE POLICY ob_sinapi_public_read ON ob_sinapi_composicoes
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_sinapi_insumos_public_read') THEN
    CREATE POLICY ob_sinapi_insumos_public_read ON ob_sinapi_composicao_insumos
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_cotacoes_select') THEN
    CREATE POLICY ob_cotacoes_select ON ob_cotacoes_mercado
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_cotacoes_insert') THEN
    CREATE POLICY ob_cotacoes_insert ON ob_cotacoes_mercado
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_cotacoes_update') THEN
    CREATE POLICY ob_cotacoes_update ON ob_cotacoes_mercado
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_cotacoes_delete') THEN
    CREATE POLICY ob_cotacoes_delete ON ob_cotacoes_mercado
      FOR DELETE USING (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
