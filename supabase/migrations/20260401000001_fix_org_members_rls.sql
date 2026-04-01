-- Fix infinite recursion in ob_org_members RLS policies
DROP POLICY IF EXISTS ob_org_members_select ON ob_org_members;
CREATE POLICY ob_org_members_select ON ob_org_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS ob_org_members_insert ON ob_org_members;
CREATE POLICY ob_org_members_insert ON ob_org_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ob_org_members_delete ON ob_org_members;
CREATE POLICY ob_org_members_delete ON ob_org_members
  FOR DELETE USING (user_id = auth.uid());
