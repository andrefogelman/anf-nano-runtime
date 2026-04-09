-- Fix RLS policies for ob_propostas and ob_proposta_items
-- Must use ob_org_members (not profiles) to match existing patterns

-- ── ob_propostas ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can read propostas for their org projects" ON ob_propostas;
DROP POLICY IF EXISTS "Users can insert propostas for their org projects" ON ob_propostas;
DROP POLICY IF EXISTS "Users can update propostas for their org projects" ON ob_propostas;
DROP POLICY IF EXISTS "Users can delete propostas for their org projects" ON ob_propostas;

CREATE POLICY ob_propostas_select ON ob_propostas FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM ob_projects p
      JOIN ob_org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY ob_propostas_insert ON ob_propostas FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM ob_projects p
      JOIN ob_org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY ob_propostas_update ON ob_propostas FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM ob_projects p
      JOIN ob_org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY ob_propostas_delete ON ob_propostas FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM ob_projects p
      JOIN ob_org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

-- ── ob_proposta_items ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can read proposta items via proposta" ON ob_proposta_items;
DROP POLICY IF EXISTS "Users can insert proposta items via proposta" ON ob_proposta_items;
DROP POLICY IF EXISTS "Users can update proposta items via proposta" ON ob_proposta_items;
DROP POLICY IF EXISTS "Users can delete proposta items via proposta" ON ob_proposta_items;

CREATE POLICY ob_proposta_items_select ON ob_proposta_items FOR SELECT
  USING (
    proposta_id IN (
      SELECT pr.id FROM ob_propostas pr
      JOIN ob_projects p ON p.id = pr.project_id
      JOIN ob_org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY ob_proposta_items_insert ON ob_proposta_items FOR INSERT
  WITH CHECK (
    proposta_id IN (
      SELECT pr.id FROM ob_propostas pr
      JOIN ob_projects p ON p.id = pr.project_id
      JOIN ob_org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY ob_proposta_items_update ON ob_proposta_items FOR UPDATE
  USING (
    proposta_id IN (
      SELECT pr.id FROM ob_propostas pr
      JOIN ob_projects p ON p.id = pr.project_id
      JOIN ob_org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY ob_proposta_items_delete ON ob_proposta_items FOR DELETE
  USING (
    proposta_id IN (
      SELECT pr.id FROM ob_propostas pr
      JOIN ob_projects p ON p.id = pr.project_id
      JOIN ob_org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );
