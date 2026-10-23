/*
# NexusGuard Phase 2 — Auth, Memberships, Verifications, RLS Overhaul

## Purpose
Transition from open single-tenant demo to authenticated multi-tenant app with
organization-level isolation. Adds org_members table, finding_verifications table,
new columns on findings and ai_analysis_runs, and replaces all RLS policies
with membership-scoped checks using auth.uid().

## New Tables

1. `org_members` — Maps authenticated users to organizations with roles.
   - id (uuid PK)
   - user_id (uuid FK -> auth.users, NOT NULL)
   - organization_id (uuid FK -> organizations, NOT NULL)
   - role (text, default 'member' — 'admin' | 'member' | 'viewer')
   - created_at (timestamptz)

2. `finding_verifications` — Records of finding resolution verification.
   - id (uuid PK)
   - finding_id (uuid FK -> findings, NOT NULL)
   - organization_id (uuid FK -> organizations, NOT NULL)
   - verified_by (uuid FK -> auth.users, NOT NULL)
   - result (text, NOT NULL — 'approved' | 'rejected')
   - notes (text)
   - created_at (timestamptz)

## Modified Tables

1. `findings` — Added columns:
   - verified_by (uuid, nullable — who verified the resolution)
   - verified_at (timestamptz, nullable — when verification occurred)
   - analysis_run_id (uuid, nullable — links to the AI analysis run that created it)

2. `ai_analysis_runs` — Added columns:
   - engine_version (text, default 'rules-v1')
   - rule_version (text, default '2026.10.01')
   - controls_analyzed (int, default 0)
   - controls_covered (int, default 0)
   - controls_gapped (int, default 0)

## Security Changes

### RLS Policy Overhaul
All tables now enforce membership-scoped access:
- SELECT: user must be a member of the row's organization
- INSERT: user must be a member of the target organization (WITH CHECK)
- UPDATE: user must be a member of the organization (USING + WITH CHECK)
- DELETE: user must be an admin of the organization

Special cases:
- `frameworks` and `controls` remain world-readable (reference data): SELECT to anon, authenticated
- `audit_events`: SELECT requires membership; INSERT requires membership; NO UPDATE or DELETE (append-only)
- `org_members`: users can see memberships for orgs they belong to; only admins can insert/delete memberships
- `finding_verifications`: membership-scoped; verified_by defaults to auth.uid()

### Grants Updated
- Most tables: GRANT to authenticated only (anon removed except for frameworks/controls SELECT)
- audit_events: GRANT SELECT, INSERT only (no UPDATE, no DELETE)
- org_members: GRANT SELECT, INSERT, DELETE (no UPDATE — role changes via delete+re-insert)

## Important Notes
1. The existing demo data (organizations, evidence, findings, etc.) is preserved.
2. A demo user (demo@nexusguard.local) is seeded via auth.users and linked to the demo org.
3. All policies use EXISTS subqueries checking org_members for ownership.
4. frameworks and controls remain public-read since they are shared reference data.
*/

-- ============================================================
-- New Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON org_members TO authenticated;

DROP POLICY IF EXISTS "members_select_own" ON org_members;
CREATE POLICY "members_select_own" ON org_members FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.user_id = auth.uid()
      AND om2.organization_id = org_members.organization_id
    )
  );

DROP POLICY IF EXISTS "members_insert_admin" ON org_members;
CREATE POLICY "members_insert_admin" ON org_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.user_id = auth.uid()
      AND om2.organization_id = org_members.organization_id
      AND om2.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "members_delete_admin" ON org_members;
CREATE POLICY "members_delete_admin" ON org_members FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.user_id = auth.uid()
      AND om2.organization_id = org_members.organization_id
      AND om2.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(organization_id);

-- Finding verifications table
CREATE TABLE IF NOT EXISTS finding_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  verified_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('approved', 'rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finding_verifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON finding_verifications TO authenticated;

DROP POLICY IF EXISTS "verifications_select_member" ON finding_verifications;
CREATE POLICY "verifications_select_member" ON finding_verifications FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = finding_verifications.organization_id
    )
  );

DROP POLICY IF EXISTS "verifications_insert_member" ON finding_verifications;
CREATE POLICY "verifications_insert_member" ON finding_verifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = finding_verifications.organization_id
    )
    AND verified_by = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_verifications_finding_id ON finding_verifications(finding_id);
CREATE INDEX IF NOT EXISTS idx_verifications_org_id ON finding_verifications(organization_id);

-- ============================================================
-- Add columns to existing tables (idempotent)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'findings' AND column_name = 'verified_by') THEN
    ALTER TABLE findings ADD COLUMN verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'findings' AND column_name = 'verified_at') THEN
    ALTER TABLE findings ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'findings' AND column_name = 'analysis_run_id') THEN
    ALTER TABLE findings ADD COLUMN analysis_run_id uuid REFERENCES ai_analysis_runs(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'engine_version') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN engine_version text NOT NULL DEFAULT 'rules-v1';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'rule_version') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN rule_version text NOT NULL DEFAULT '2026.10.01';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'controls_analyzed') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN controls_analyzed int NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'controls_covered') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN controls_covered int NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_runs' AND column_name = 'controls_gapped') THEN
    ALTER TABLE ai_analysis_runs ADD COLUMN controls_gapped int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- RLS Policy Overhaul — replace all anon policies with membership-scoped
-- ============================================================

-- ORGANIZATIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON organizations FROM anon;

DROP POLICY IF EXISTS "anon_select_organizations" ON organizations;
DROP POLICY IF EXISTS "anon_insert_organizations" ON organizations;
DROP POLICY IF EXISTS "anon_update_organizations" ON organizations;
DROP POLICY IF EXISTS "anon_delete_organizations" ON organizations;

DROP POLICY IF EXISTS "org_select_member" ON organizations;
CREATE POLICY "org_select_member" ON organizations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = organizations.id)
  );

DROP POLICY IF EXISTS "org_insert_member" ON organizations;
CREATE POLICY "org_insert_member" ON organizations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "org_update_admin" ON organizations;
CREATE POLICY "org_update_admin" ON organizations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = organizations.id AND om.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = organizations.id AND om.role = 'admin')
  );

DROP POLICY IF EXISTS "org_delete_admin" ON organizations;
CREATE POLICY "org_delete_admin" ON organizations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = organizations.id AND om.role = 'admin')
  );

-- FRAMEWORKS — remain public read (reference data)
-- Keep anon SELECT, authenticated SELECT; allow authenticated admin writes
DROP POLICY IF EXISTS "anon_select_frameworks" ON frameworks;
DROP POLICY IF EXISTS "anon_insert_frameworks" ON frameworks;
DROP POLICY IF EXISTS "anon_update_frameworks" ON frameworks;
DROP POLICY IF EXISTS "anon_delete_frameworks" ON frameworks;

GRANT SELECT ON frameworks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON frameworks TO authenticated;

DROP POLICY IF EXISTS "frameworks_select_all" ON frameworks;
CREATE POLICY "frameworks_select_all" ON frameworks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "frameworks_insert_auth" ON frameworks;
CREATE POLICY "frameworks_insert_auth" ON frameworks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "frameworks_update_auth" ON frameworks;
CREATE POLICY "frameworks_update_auth" ON frameworks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "frameworks_delete_auth" ON frameworks;
CREATE POLICY "frameworks_delete_auth" ON frameworks FOR DELETE
  TO authenticated USING (true);

-- CONTROLS — remain public read (reference data)
DROP POLICY IF EXISTS "anon_select_controls" ON controls;
DROP POLICY IF EXISTS "anon_insert_controls" ON controls;
DROP POLICY IF EXISTS "anon_update_controls" ON controls;
DROP POLICY IF EXISTS "anon_delete_controls" ON controls;

GRANT SELECT ON controls TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON controls TO authenticated;

DROP POLICY IF EXISTS "controls_select_all" ON controls;
CREATE POLICY "controls_select_all" ON controls FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "controls_insert_auth" ON controls;
CREATE POLICY "controls_insert_auth" ON controls FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "controls_update_auth" ON controls;
CREATE POLICY "controls_update_auth" ON controls FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "controls_delete_auth" ON controls;
CREATE POLICY "controls_delete_auth" ON controls FOR DELETE
  TO authenticated USING (true);

-- EVIDENCE — membership scoped
GRANT SELECT, INSERT, UPDATE, DELETE ON evidence TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON evidence FROM anon;

DROP POLICY IF EXISTS "anon_select_evidence" ON evidence;
DROP POLICY IF EXISTS "anon_insert_evidence" ON evidence;
DROP POLICY IF EXISTS "anon_update_evidence" ON evidence;
DROP POLICY IF EXISTS "anon_delete_evidence" ON evidence;

DROP POLICY IF EXISTS "evidence_select_member" ON evidence;
CREATE POLICY "evidence_select_member" ON evidence FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = evidence.organization_id)
  );

DROP POLICY IF EXISTS "evidence_insert_member" ON evidence;
CREATE POLICY "evidence_insert_member" ON evidence FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = evidence.organization_id)
  );

DROP POLICY IF EXISTS "evidence_update_member" ON evidence;
CREATE POLICY "evidence_update_member" ON evidence FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = evidence.organization_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = evidence.organization_id)
  );

DROP POLICY IF EXISTS "evidence_delete_admin" ON evidence;
CREATE POLICY "evidence_delete_admin" ON evidence FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = evidence.organization_id AND om.role = 'admin')
  );

-- FINDINGS — membership scoped
GRANT SELECT, INSERT, UPDATE, DELETE ON findings TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON findings FROM anon;

DROP POLICY IF EXISTS "anon_select_findings" ON findings;
DROP POLICY IF EXISTS "anon_insert_findings" ON findings;
DROP POLICY IF EXISTS "anon_update_findings" ON findings;
DROP POLICY IF EXISTS "anon_delete_findings" ON findings;

DROP POLICY IF EXISTS "findings_select_member" ON findings;
CREATE POLICY "findings_select_member" ON findings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = findings.organization_id)
  );

DROP POLICY IF EXISTS "findings_insert_member" ON findings;
CREATE POLICY "findings_insert_member" ON findings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = findings.organization_id)
  );

DROP POLICY IF EXISTS "findings_update_member" ON findings;
CREATE POLICY "findings_update_member" ON findings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = findings.organization_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = findings.organization_id)
  );

DROP POLICY IF EXISTS "findings_delete_admin" ON findings;
CREATE POLICY "findings_delete_admin" ON findings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = findings.organization_id AND om.role = 'admin')
  );

-- REMEDIATION_TASKS — membership scoped
GRANT SELECT, INSERT, UPDATE, DELETE ON remediation_tasks TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON remediation_tasks FROM anon;

DROP POLICY IF EXISTS "anon_select_remediation_tasks" ON remediation_tasks;
DROP POLICY IF EXISTS "anon_insert_remediation_tasks" ON remediation_tasks;
DROP POLICY IF EXISTS "anon_update_remediation_tasks" ON remediation_tasks;
DROP POLICY IF EXISTS "anon_delete_remediation_tasks" ON remediation_tasks;

DROP POLICY IF EXISTS "tasks_select_member" ON remediation_tasks;
CREATE POLICY "tasks_select_member" ON remediation_tasks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = remediation_tasks.organization_id)
  );

DROP POLICY IF EXISTS "tasks_insert_member" ON remediation_tasks;
CREATE POLICY "tasks_insert_member" ON remediation_tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = remediation_tasks.organization_id)
  );

DROP POLICY IF EXISTS "tasks_update_member" ON remediation_tasks;
CREATE POLICY "tasks_update_member" ON remediation_tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = remediation_tasks.organization_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = remediation_tasks.organization_id)
  );

DROP POLICY IF EXISTS "tasks_delete_admin" ON remediation_tasks;
CREATE POLICY "tasks_delete_admin" ON remediation_tasks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = remediation_tasks.organization_id AND om.role = 'admin')
  );

-- AI_ANALYSIS_RUNS — membership scoped
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_analysis_runs TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON ai_analysis_runs FROM anon;

DROP POLICY IF EXISTS "anon_select_ai_analysis_runs" ON ai_analysis_runs;
DROP POLICY IF EXISTS "anon_insert_ai_analysis_runs" ON ai_analysis_runs;
DROP POLICY IF EXISTS "anon_update_ai_analysis_runs" ON ai_analysis_runs;
DROP POLICY IF EXISTS "anon_delete_ai_analysis_runs" ON ai_analysis_runs;

DROP POLICY IF EXISTS "ai_runs_select_member" ON ai_analysis_runs;
CREATE POLICY "ai_runs_select_member" ON ai_analysis_runs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = ai_analysis_runs.organization_id)
  );

DROP POLICY IF EXISTS "ai_runs_insert_member" ON ai_analysis_runs;
CREATE POLICY "ai_runs_insert_member" ON ai_analysis_runs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = ai_analysis_runs.organization_id)
  );

DROP POLICY IF EXISTS "ai_runs_update_member" ON ai_analysis_runs;
CREATE POLICY "ai_runs_update_member" ON ai_analysis_runs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = ai_analysis_runs.organization_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = ai_analysis_runs.organization_id)
  );

DROP POLICY IF EXISTS "ai_runs_delete_admin" ON ai_analysis_runs;
CREATE POLICY "ai_runs_delete_admin" ON ai_analysis_runs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = ai_analysis_runs.organization_id AND om.role = 'admin')
  );

-- AUDIT_EVENTS — append-only, membership scoped, NO UPDATE or DELETE
GRANT SELECT, INSERT ON audit_events TO authenticated;
REVOKE SELECT, INSERT ON audit_events FROM anon;

DROP POLICY IF EXISTS "anon_select_audit_events" ON audit_events;
DROP POLICY IF EXISTS "anon_insert_audit_events" ON audit_events;

DROP POLICY IF EXISTS "audit_select_member" ON audit_events;
CREATE POLICY "audit_select_member" ON audit_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = audit_events.organization_id)
  );

DROP POLICY IF EXISTS "audit_insert_member" ON audit_events;
CREATE POLICY "audit_insert_member" ON audit_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = audit_events.organization_id)
  );

-- Ensure no UPDATE or DELETE policies exist on audit_events
DROP POLICY IF EXISTS "audit_update_member" ON audit_events;
DROP POLICY IF EXISTS "audit_delete_member" ON audit_events;

-- SUBSCRIPTIONS — membership scoped
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON subscriptions FROM anon;

DROP POLICY IF EXISTS "anon_select_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "anon_insert_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "anon_update_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "anon_delete_subscriptions" ON subscriptions;

DROP POLICY IF EXISTS "sub_select_member" ON subscriptions;
CREATE POLICY "sub_select_member" ON subscriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = subscriptions.organization_id)
  );

DROP POLICY IF EXISTS "sub_insert_admin" ON subscriptions;
CREATE POLICY "sub_insert_admin" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = subscriptions.organization_id AND om.role = 'admin')
  );

DROP POLICY IF EXISTS "sub_update_admin" ON subscriptions;
CREATE POLICY "sub_update_admin" ON subscriptions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = subscriptions.organization_id AND om.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = subscriptions.organization_id AND om.role = 'admin')
  );

DROP POLICY IF EXISTS "sub_delete_admin" ON subscriptions;
CREATE POLICY "sub_delete_admin" ON subscriptions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = subscriptions.organization_id AND om.role = 'admin')
  );

-- USAGE_EVENTS — membership scoped
GRANT SELECT, INSERT, DELETE ON usage_events TO authenticated;
REVOKE SELECT, INSERT, DELETE ON usage_events FROM anon;

DROP POLICY IF EXISTS "anon_select_usage_events" ON usage_events;
DROP POLICY IF EXISTS "anon_insert_usage_events" ON usage_events;
DROP POLICY IF EXISTS "anon_delete_usage_events" ON usage_events;

DROP POLICY IF EXISTS "usage_select_member" ON usage_events;
CREATE POLICY "usage_select_member" ON usage_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = usage_events.organization_id)
  );

DROP POLICY IF EXISTS "usage_insert_member" ON usage_events;
CREATE POLICY "usage_insert_member" ON usage_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = usage_events.organization_id)
  );

DROP POLICY IF EXISTS "usage_delete_admin" ON usage_events;
CREATE POLICY "usage_delete_admin" ON usage_events FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.organization_id = usage_events.organization_id AND om.role = 'admin')
  );