-- Sprint 5 — audit log centralizado para compliance LGPD
-- Registra ações sensíveis: criar/deletar projeto/org/membro, exports,
-- refresh manual SINAPI, cron runs, tentativas de auth (etc).

CREATE TABLE IF NOT EXISTS ob_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id),
  org_id       uuid REFERENCES ob_organizations(id) ON DELETE CASCADE,
  action       text NOT NULL,                                    -- ex: 'export.xlsx', 'project.delete', 'sinapi.match'
  target_type  text,                                             -- ex: 'project', 'org', 'sinapi_chunk'
  target_id    uuid,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,               -- payload livre (ex: {project_name, bdi_pct, n_items})
  ip           text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_audit_log_org_created
  ON ob_audit_log(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ob_audit_log_user_created
  ON ob_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ob_audit_log_action
  ON ob_audit_log(action, created_at DESC);

ALTER TABLE ob_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_audit_log_select') THEN
    CREATE POLICY ob_audit_log_select ON ob_audit_log
      FOR SELECT USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- INSERT só via service-role (backend audit helper). Sem policy de INSERT pra users.

COMMENT ON TABLE ob_audit_log IS
  'Registro de auditoria LGPD/compliance — escrito apenas pelo backend (service-role) via api/lib/audit.py.';
