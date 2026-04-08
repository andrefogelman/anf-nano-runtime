-- Propostas (supplier proposals)
CREATE TABLE ob_propostas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES ob_projects(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES ob_project_files(id) ON DELETE SET NULL,
  fornecedor text NOT NULL DEFAULT '',
  valor_total numeric(14,2),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'extracted', 'reviewed')),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_propostas_project ON ob_propostas(project_id);

ALTER TABLE ob_propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read propostas for their org projects"
  ON ob_propostas FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM ob_projects WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert propostas for their org projects"
  ON ob_propostas FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM ob_projects WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update propostas for their org projects"
  ON ob_propostas FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM ob_projects WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete propostas for their org projects"
  ON ob_propostas FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM ob_projects WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Proposta items (extracted line items)
CREATE TABLE ob_proposta_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id uuid REFERENCES ob_propostas(id) ON DELETE CASCADE NOT NULL,
  descricao text NOT NULL DEFAULT '',
  unidade text,
  quantidade numeric(14,4),
  preco_unitario numeric(14,2),
  preco_total numeric(14,2),
  confidence numeric(3,2) DEFAULT 0,
  needs_review boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_proposta_items_proposta ON ob_proposta_items(proposta_id);

ALTER TABLE ob_proposta_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read proposta items via proposta"
  ON ob_proposta_items FOR SELECT
  USING (
    proposta_id IN (
      SELECT id FROM ob_propostas WHERE project_id IN (
        SELECT id FROM ob_projects WHERE org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert proposta items via proposta"
  ON ob_proposta_items FOR INSERT
  WITH CHECK (
    proposta_id IN (
      SELECT id FROM ob_propostas WHERE project_id IN (
        SELECT id FROM ob_projects WHERE org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update proposta items via proposta"
  ON ob_proposta_items FOR UPDATE
  USING (
    proposta_id IN (
      SELECT id FROM ob_propostas WHERE project_id IN (
        SELECT id FROM ob_projects WHERE org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete proposta items via proposta"
  ON ob_proposta_items FOR DELETE
  USING (
    proposta_id IN (
      SELECT id FROM ob_propostas WHERE project_id IN (
        SELECT id FROM ob_projects WHERE org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );
