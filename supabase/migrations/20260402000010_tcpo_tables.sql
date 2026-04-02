-- TCPO compositions and insumos tables

CREATE TABLE IF NOT EXISTS ob_tcpo_composicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  descricao text NOT NULL,
  unidade text NOT NULL,
  categoria text,
  regiao text DEFAULT 'São Paulo',
  data_precos text,
  ls_percentual numeric(8,2) DEFAULT 0,
  bdi_percentual numeric(8,2) DEFAULT 0,
  custo_sem_taxas numeric(14,4) DEFAULT 0,
  custo_com_taxas numeric(14,4) DEFAULT 0,
  search_term text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(codigo)
);

CREATE INDEX IF NOT EXISTS idx_ob_tcpo_codigo ON ob_tcpo_composicoes(codigo);
CREATE INDEX IF NOT EXISTS idx_ob_tcpo_categoria ON ob_tcpo_composicoes(categoria);

-- Enable pg_trgm for fuzzy search on TCPO too
CREATE INDEX IF NOT EXISTS idx_ob_tcpo_descricao_trgm ON ob_tcpo_composicoes USING gin (descricao gin_trgm_ops);

CREATE TABLE IF NOT EXISTS ob_tcpo_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composicao_id uuid NOT NULL REFERENCES ob_tcpo_composicoes(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  descricao text NOT NULL,
  unidade text,
  classe text,
  coeficiente numeric(14,6) DEFAULT 0,
  preco_unitario numeric(14,4) DEFAULT 0,
  total numeric(14,4) DEFAULT 0,
  consumo numeric(14,6) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ob_tcpo_insumos_comp ON ob_tcpo_insumos(composicao_id);

-- RLS: public read-only (same as SINAPI)
ALTER TABLE ob_tcpo_composicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_tcpo_insumos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_tcpo_composicoes_public_read') THEN
    CREATE POLICY ob_tcpo_composicoes_public_read ON ob_tcpo_composicoes FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_tcpo_insumos_public_read') THEN
    CREATE POLICY ob_tcpo_insumos_public_read ON ob_tcpo_insumos FOR SELECT USING (true);
  END IF;
END $$;
