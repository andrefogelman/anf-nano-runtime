-- Sprint 2 — cross-checks entre vision (LLM) e DXF (determinístico)
-- Quando ambos estão disponíveis, comparamos métricas (área de piso, contagem de
-- pontos elétricos, etc) e flagamos divergências > 10% para revisão humana.

CREATE TABLE IF NOT EXISTS ob_cross_checks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES ob_projects(id) ON DELETE CASCADE,
  metric        text NOT NULL,                       -- ex: "area_piso_m2", "n_pontos_tomada"
  ambiente      text,                                -- escopo opcional (ambiente/pavimento)
  vision_value  numeric,
  dxf_value     numeric,
  diff_percent  numeric GENERATED ALWAYS AS (
    CASE
      WHEN dxf_value IS NULL OR dxf_value = 0 THEN NULL
      ELSE abs(coalesce(vision_value, 0) - dxf_value) / abs(dxf_value) * 100
    END
  ) STORED,
  flagged       boolean GENERATED ALWAYS AS (
    CASE
      WHEN dxf_value IS NULL OR dxf_value = 0 THEN false
      ELSE abs(coalesce(vision_value, 0) - dxf_value) / abs(dxf_value) > 0.1
    END
  ) STORED,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_cross_checks_project
  ON ob_cross_checks(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ob_cross_checks_flagged
  ON ob_cross_checks(project_id) WHERE flagged = true;

ALTER TABLE ob_cross_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_cross_checks_select') THEN
    CREATE POLICY ob_cross_checks_select ON ob_cross_checks
      FOR SELECT USING (
        project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;
