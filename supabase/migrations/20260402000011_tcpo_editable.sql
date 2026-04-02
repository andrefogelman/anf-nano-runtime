-- Allow authenticated users to INSERT, UPDATE, DELETE on TCPO tables
-- Keep public SELECT (already exists)

-- ob_tcpo_composicoes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_tcpo_composicoes_auth_insert') THEN
    CREATE POLICY ob_tcpo_composicoes_auth_insert ON ob_tcpo_composicoes
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_tcpo_composicoes_auth_update') THEN
    CREATE POLICY ob_tcpo_composicoes_auth_update ON ob_tcpo_composicoes
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_tcpo_composicoes_auth_delete') THEN
    CREATE POLICY ob_tcpo_composicoes_auth_delete ON ob_tcpo_composicoes
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ob_tcpo_insumos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_tcpo_insumos_auth_insert') THEN
    CREATE POLICY ob_tcpo_insumos_auth_insert ON ob_tcpo_insumos
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_tcpo_insumos_auth_update') THEN
    CREATE POLICY ob_tcpo_insumos_auth_update ON ob_tcpo_insumos
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_tcpo_insumos_auth_delete') THEN
    CREATE POLICY ob_tcpo_insumos_auth_delete ON ob_tcpo_insumos
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
