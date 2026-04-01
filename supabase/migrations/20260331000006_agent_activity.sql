-- 006_agent_activity.sql
-- Agent activity logging and conversation history

CREATE TABLE IF NOT EXISTS ob_agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES ob_projects(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  description text,
  input jsonb,
  output jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_agent_activity_project ON ob_agent_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_ob_agent_activity_agent ON ob_agent_activity_log(agent_slug);
CREATE INDEX IF NOT EXISTS idx_ob_agent_activity_created ON ob_agent_activity_log(created_at);

CREATE TABLE IF NOT EXISTS ob_agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES ob_projects(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content text NOT NULL,
  tool_calls jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_agent_conversations_project ON ob_agent_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_ob_agent_conversations_agent ON ob_agent_conversations(agent_slug, created_at);

-- RLS
ALTER TABLE ob_agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_agent_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_agent_activity_select') THEN
    CREATE POLICY ob_agent_activity_select ON ob_agent_activity_log
      FOR SELECT USING (
        project_id IS NULL OR project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_agent_conversations_select') THEN
    CREATE POLICY ob_agent_conversations_select ON ob_agent_conversations
      FOR SELECT USING (
        project_id IS NULL OR project_id IN (
          SELECT p.id FROM ob_projects p
          JOIN ob_org_members om ON om.org_id = p.org_id
          WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;
