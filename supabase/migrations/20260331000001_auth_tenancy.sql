-- 001_auth_tenancy.sql
-- Organizations and membership (ob_ prefix to avoid conflicts with anfconstrucoes)

CREATE TABLE IF NOT EXISTS ob_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ob_org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES ob_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ob_org_members_org ON ob_org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_ob_org_members_user ON ob_org_members(user_id);

-- RLS
ALTER TABLE ob_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ob_org_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_organizations_select') THEN
    CREATE POLICY ob_organizations_select ON ob_organizations
      FOR SELECT USING (
        id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_organizations_insert') THEN
    CREATE POLICY ob_organizations_insert ON ob_organizations
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_organizations_update') THEN
    CREATE POLICY ob_organizations_update ON ob_organizations
      FOR UPDATE USING (
        id IN (
          SELECT org_id FROM ob_org_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_org_members_select') THEN
    CREATE POLICY ob_org_members_select ON ob_org_members
      FOR SELECT USING (
        org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_org_members_insert') THEN
    CREATE POLICY ob_org_members_insert ON ob_org_members
      FOR INSERT WITH CHECK (
        org_id IN (
          SELECT org_id FROM ob_org_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ob_org_members_delete') THEN
    CREATE POLICY ob_org_members_delete ON ob_org_members
      FOR DELETE USING (
        org_id IN (
          SELECT org_id FROM ob_org_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
