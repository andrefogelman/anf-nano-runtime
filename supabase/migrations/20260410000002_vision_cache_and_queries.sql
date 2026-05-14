-- Sprint 0 — cache de respostas vision + histórico de queries (audit + memorial)
-- Tabelas: ob_vision_cache, ob_vision_queries
-- Referência: docs/superpowers/plans/2026-04-08-orcamentista-central-controller.md (Sprint 0.10)

-- ============================================================
-- ob_vision_cache: cache idempotente por (pdf_sha256, question_hash)
-- ============================================================
CREATE TABLE IF NOT EXISTS ob_vision_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_sha256    text NOT NULL,
  question_hash text NOT NULL,
  resposta      jsonb NOT NULL,
  org_id        uuid REFERENCES ob_organizations(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES ob_projects(id) ON DELETE SET NULL,
  hit_count     int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  accessed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pdf_sha256, question_hash)
);

CREATE INDEX IF NOT EXISTS idx_ob_vision_cache_lookup
  ON ob_vision_cache(pdf_sha256, question_hash);

CREATE INDEX IF NOT EXISTS idx_ob_vision_cache_org
  ON ob_vision_cache(org_id) WHERE org_id IS NOT NULL;

-- ============================================================
-- ob_vision_queries: histórico completo (telemetria, custo, memorial de cálculo)
-- ============================================================
CREATE TABLE IF NOT EXISTS ob_vision_queries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES ob_projects(id) ON DELETE CASCADE,
  pdf_page_id      uuid REFERENCES ob_pdf_pages(id) ON DELETE SET NULL,
  user_id          uuid REFERENCES auth.users(id),
  pergunta         text NOT NULL,
  variaveis        jsonb DEFAULT '{}'::jsonb,
  provider         text,
  model            text,
  reasoning_effort text,
  resposta         jsonb NOT NULL,
  cache_hit        boolean NOT NULL DEFAULT false,
  custo_usd        numeric(10,5),
  duracao_s        numeric(8,2),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_vision_queries_project
  ON ob_vision_queries(project_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE ob_vision_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_vision_queries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_vision_cache_select') THEN
    CREATE POLICY ob_vision_cache_select ON ob_vision_cache
      FOR SELECT USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Service role escreve no cache. Usuários só leem (cache é write-by-backend).
-- Nenhuma policy de INSERT/UPDATE para usuários.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_vision_queries_select') THEN
    CREATE POLICY ob_vision_queries_select ON ob_vision_queries
      FOR SELECT USING (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;
