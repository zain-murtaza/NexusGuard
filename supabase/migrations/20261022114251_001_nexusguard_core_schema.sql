/*
# NexusGuard Core Schema

Creates the foundational data model for NexusGuard, a security evidence management SaaS.
Single-tenant demo MVP (no auth screen) — policies use TO anon, authenticated with USING(true).
*/

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_organizations" ON organizations;
CREATE POLICY "anon_select_organizations" ON organizations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_organizations" ON organizations;
CREATE POLICY "anon_insert_organizations" ON organizations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_organizations" ON organizations;
CREATE POLICY "anon_update_organizations" ON organizations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_organizations" ON organizations;
CREATE POLICY "anon_delete_organizations" ON organizations FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON frameworks TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_frameworks" ON frameworks;
CREATE POLICY "anon_select_frameworks" ON frameworks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_frameworks" ON frameworks;
CREATE POLICY "anon_insert_frameworks" ON frameworks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_frameworks" ON frameworks;
CREATE POLICY "anon_update_frameworks" ON frameworks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_frameworks" ON frameworks;
CREATE POLICY "anon_delete_frameworks" ON frameworks FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  reference text NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON controls TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_controls" ON controls;
CREATE POLICY "anon_select_controls" ON controls FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_controls" ON controls;
CREATE POLICY "anon_insert_controls" ON controls FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_controls" ON controls;
CREATE POLICY "anon_update_controls" ON controls FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_controls" ON controls;
CREATE POLICY "anon_delete_controls" ON controls FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_controls_framework_id ON controls(framework_id);

CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id uuid REFERENCES controls(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  source_type text,
  source_reference text,
  collection_method text,
  status text NOT NULL DEFAULT 'collected',
  collected_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON evidence TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_evidence" ON evidence;
CREATE POLICY "anon_select_evidence" ON evidence FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_evidence" ON evidence;
CREATE POLICY "anon_insert_evidence" ON evidence FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_evidence" ON evidence;
CREATE POLICY "anon_update_evidence" ON evidence FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_evidence" ON evidence;
CREATE POLICY "anon_delete_evidence" ON evidence FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_evidence_org_id ON evidence(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_control_id ON evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence(status);

CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id uuid REFERENCES controls(id) ON DELETE SET NULL,
  evidence_id uuid REFERENCES evidence(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'open',
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON findings TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_findings" ON findings;
CREATE POLICY "anon_select_findings" ON findings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_findings" ON findings;
CREATE POLICY "anon_insert_findings" ON findings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_findings" ON findings;
CREATE POLICY "anon_update_findings" ON findings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_findings" ON findings;
CREATE POLICY "anon_delete_findings" ON findings FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_findings_org_id ON findings(organization_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);

CREATE TABLE IF NOT EXISTS remediation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE remediation_tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON remediation_tasks TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_remediation_tasks" ON remediation_tasks;
CREATE POLICY "anon_select_remediation_tasks" ON remediation_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_remediation_tasks" ON remediation_tasks;
CREATE POLICY "anon_insert_remediation_tasks" ON remediation_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_remediation_tasks" ON remediation_tasks;
CREATE POLICY "anon_update_remediation_tasks" ON remediation_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_remediation_tasks" ON remediation_tasks;
CREATE POLICY "anon_delete_remediation_tasks" ON remediation_tasks FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_remediation_org_id ON remediation_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_remediation_status ON remediation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_remediation_finding_id ON remediation_tasks(finding_id);

CREATE TABLE IF NOT EXISTS ai_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input_summary text,
  result_summary text,
  findings_count int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_analysis_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_analysis_runs TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_ai_analysis_runs" ON ai_analysis_runs;
CREATE POLICY "anon_select_ai_analysis_runs" ON ai_analysis_runs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ai_analysis_runs" ON ai_analysis_runs;
CREATE POLICY "anon_insert_ai_analysis_runs" ON ai_analysis_runs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ai_analysis_runs" ON ai_analysis_runs;
CREATE POLICY "anon_update_ai_analysis_runs" ON ai_analysis_runs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ai_analysis_runs" ON ai_analysis_runs;
CREATE POLICY "anon_delete_ai_analysis_runs" ON ai_analysis_runs FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_ai_runs_org_id ON ai_analysis_runs(organization_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON audit_events TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_audit_events" ON audit_events;
CREATE POLICY "anon_select_audit_events" ON audit_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_events" ON audit_events;
CREATE POLICY "anon_insert_audit_events" ON audit_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_audit_org_id ON audit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  seats int NOT NULL DEFAULT 1,
  current_period_end date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_subscriptions" ON subscriptions;
CREATE POLICY "anon_select_subscriptions" ON subscriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subscriptions" ON subscriptions;
CREATE POLICY "anon_insert_subscriptions" ON subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subscriptions" ON subscriptions;
CREATE POLICY "anon_update_subscriptions" ON subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subscriptions" ON subscriptions;
CREATE POLICY "anon_delete_subscriptions" ON subscriptions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(organization_id);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON usage_events TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_usage_events" ON usage_events;
CREATE POLICY "anon_select_usage_events" ON usage_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_usage_events" ON usage_events;
CREATE POLICY "anon_insert_usage_events" ON usage_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_usage_events" ON usage_events;
CREATE POLICY "anon_delete_usage_events" ON usage_events FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_usage_org_id ON usage_events(organization_id);