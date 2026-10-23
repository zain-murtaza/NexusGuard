/*
# NexusGuard Seed Data — DEMONSTRATION ONLY

All data is explicitly labelled as sample/demonstration data.
The organization has is_demo = true and all evidence has is_sample = true.
*/

INSERT INTO organizations (id, name, slug, plan, is_demo)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Demo SaaS Corp (Sample)', 'demo-saas-corp', 'professional', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subscriptions (organization_id, plan, status, seats, current_period_end)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'professional', 'active', 5, '2026-12-31')
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO frameworks (id, name, code, description) VALUES
  ('f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'SOC 2 Type II', 'SOC2', 'AICPA SOC 2 Type II framework for security, availability, processing integrity, confidentiality, and privacy.'),
  ('f2b3c4d5-e6f7-7890-abcd-ef1234567890', 'ISO/IEC 27001', 'ISO27001', 'International standard for information security management systems (ISMS).')
ON CONFLICT (code) DO NOTHING;

INSERT INTO controls (id, framework_id, reference, title, description, category) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'CC6.1', 'Logical and Physical Access Controls', 'The entity implements logical access security software, infrastructure, and controls over its information system to protect the system from unauthorized access.', 'Access Control'),
  ('c1000000-0000-0000-0000-000000000002', 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'CC6.2', 'User Authentication', 'The entity authenticates users before granting access to the system and periodically re-authenticates users during active sessions.', 'Access Control'),
  ('c1000000-0000-0000-0000-000000000003', 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'CC6.3', 'Access Authorization', 'The entity authorizes, modifies, and removes access to data, software, functions, and other protected information assets.', 'Access Control'),
  ('c1000000-0000-0000-0000-000000000004', 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'CC7.1', 'System Monitoring', 'The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and other events that could disrupt the system.', 'Monitoring'),
  ('c1000000-0000-0000-0000-000000000005', 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'CC7.2', 'Incident Response', 'The entity detects, analyzes, and responds to security incidents and other events that could disrupt the system.', 'Monitoring'),
  ('c1000000-0000-0000-0000-000000000006', 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'CC8.1', 'Change Management', 'The entity authorizes, designs, tests, and approves changes to infrastructure, data, software, and procedures before implementation.', 'Change Management'),
  ('c1000000-0000-0000-0000-000000000007', 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'CC4.1', 'Risk Assessment', 'The entity considers risks to the system and identifies, analyzes, and manages risks relevant to the system.', 'Risk Management'),
  ('c1000000-0000-0000-0000-000000000008', 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'CC4.2', 'Internal Communication', 'The entity communicates and enforces policies and procedures that describe authorized and unauthorized activities.', 'Risk Management'),
  ('c2000000-0000-0000-0000-000000000001', 'f2b3c4d5-e6f7-7890-abcd-ef1234567890', 'A.5.1', 'Policies for Information Security', 'A set of policies for information security shall be defined, approved, and communicated to employees and relevant external parties.', 'Governance'),
  ('c2000000-0000-0000-0000-000000000002', 'f2b3c4d5-e6f7-7890-abcd-ef1234567890', 'A.8.1', 'Identification of Assets', 'All assets shall be identified and an inventory of assets shall be maintained.', 'Asset Management'),
  ('c2000000-0000-0000-0000-000000000003', 'f2b3c4d5-e6f7-7890-abcd-ef1234567890', 'A.8.2', 'Classification of Information', 'Information shall be classified in terms of legal requirements, value, criticality, and sensitivity to unauthorized disclosure.', 'Asset Management'),
  ('c2000000-0000-0000-0000-000000000004', 'f2b3c4d5-e6f7-7890-abcd-ef1234567890', 'A.9.1', 'Business Requirements of Security', 'Access to information and other associated assets shall be restricted to authorized users and processes.', 'Access Control'),
  ('c2000000-0000-0000-0000-000000000005', 'f2b3c4d5-e6f7-7890-abcd-ef1234567890', 'A.12.1', 'Operational Procedures and Responsibilities', 'Procedures shall be established and documented for all information processing facilities.', 'Operations Security')
ON CONFLICT DO NOTHING;

INSERT INTO evidence (id, organization_id, control_id, title, description, source_type, source_reference, collection_method, status, collected_at, verified_at, is_sample) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000001', 'SAML SSO Configuration Export (Sample)', 'Exported SAML SSO configuration showing all identity providers and authentication settings.', 'configuration', 'okta://saml-config-export', 'automated', 'verified', '2026-10-01 14:00:00+00', '2026-10-03 09:30:00+00', true),
  ('e1000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000002', 'Password Policy Screenshot (Sample)', 'Screenshot of password policy settings enforcing minimum length, complexity, and rotation.', 'screenshot', 'file://password-policy.png', 'manual', 'verified', '2026-10-02 10:00:00+00', '2026-10-03 09:30:00+00', true),
  ('e1000000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000003', 'Role-Based Access Control Matrix (Sample)', 'Exported RBAC matrix showing all roles, permissions, and assigned users.', 'document', 'notion://rbac-matrix', 'manual', 'collected', '2026-10-05 11:00:00+00', NULL, true),
  ('e1000000-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000004', 'SIEM Alert Dashboard Export (Sample)', 'Exported SIEM dashboard showing alert volume, response times, and resolution status.', 'api_export', 'splunk://alerts-dashboard', 'automated', 'verified', '2026-10-04 16:00:00+00', '2026-10-05 10:00:00+00', true),
  ('e1000000-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000005', 'Incident Response Playbook (Sample)', 'Documented incident response procedures with severity classification and escalation paths.', 'document', 'github://secops/incident-response.md', 'manual', 'verified', '2026-09-28 09:00:00+00', '2026-09-30 14:00:00+00', true),
  ('e1000000-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000006', 'CI/CD Pipeline Change Log (Sample)', 'Exported change log from CI/CD pipeline showing all deployments with approval status.', 'api_export', 'github://actions/deployments', 'automated', 'collected', '2026-10-06 08:00:00+00', NULL, true),
  ('e1000000-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000007', 'Annual Risk Assessment Report (Sample)', 'Comprehensive risk assessment identifying threats, vulnerabilities, and risk ratings.', 'document', 'file://risk-assessment-2026.pdf', 'manual', 'verified', '2026-09-15 12:00:00+00', '2026-09-20 10:00:00+00', true),
  ('e1000000-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NULL, 'Employee Security Training Records (Sample)', 'Export of completed security awareness training sessions with completion rates.', 'api_export', 'workday://training-records', 'automated', 'expired', '2026-06-01 10:00:00+00', NULL, true),
  ('e1000000-0000-0000-0000-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c2000000-0000-0000-0000-000000000001', 'Information Security Policy Document (Sample)', 'Current version of the information security policy approved by management.', 'document', 'file://infosec-policy-v3.pdf', 'manual', 'verified', '2026-09-10 10:00:00+00', '2026-09-12 14:00:00+00', true),
  ('e1000000-0000-0000-0000-000000000010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c2000000-0000-0000-0000-000000000004', 'Access Control Review Log (Sample)', 'Quarterly access review log showing reviewer, date, and actions taken.', 'document', 'file://access-review-q3.csv', 'manual', 'collected', '2026-10-01 15:00:00+00', NULL, true)
ON CONFLICT DO NOTHING;

INSERT INTO findings (id, organization_id, control_id, evidence_id, title, description, severity, status, reasoning, created_at) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'RBAC Matrix Not Reviewed (Sample)', 'The role-based access control matrix has not been formally reviewed or approved. Evidence shows the document exists but lacks review signatures or approval dates.', 'high', 'open', 'AI gap analysis identified that while an RBAC matrix exists, there is no evidence of formal review or approval. This represents a gap in CC6.3 access authorization requirements.', '2026-10-07 10:00:00+00'),
  ('d1000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000006', 'Deployment Approvals Not Enforced (Sample)', 'CI/CD pipeline change log shows several deployments without explicit approval records. Change management control CC8.1 requires authorization before implementation.', 'medium', 'open', 'Analysis of deployment logs revealed 3 out of 12 recent deployments lacked recorded approval, indicating the approval gate may not be consistently enforced.', '2026-10-07 11:00:00+00'),
  ('d1000000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NULL, 'e1000000-0000-0000-0000-000000000008', 'Security Training Records Expired (Sample)', 'Employee security awareness training records have expired. The last training session was completed over 4 months ago and the evidence status is marked as expired.', 'medium', 'acknowledged', 'The training evidence collected on 2026-06-01 has an expired status. Training should be renewed quarterly per internal policy.', '2026-10-07 12:00:00+00'),
  ('d1000000-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000010', 'Access Review Not Completed for Q3 (Sample)', 'Access review log for Q3 shows collection but no verification. No evidence of remediation for excessive permissions identified during the review.', 'high', 'open', 'The access review log was collected but shows no verification or remediation actions. ISO 27001 A.9.1 requires periodic review of access rights.', '2026-10-08 09:00:00+00'),
  ('d1000000-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'MFA Not Enforced for All Users (Sample)', 'Password policy screenshot shows strong password requirements but does not indicate multi-factor authentication is enforced for all user accounts.', 'critical', 'open', 'CC6.2 requires strong authentication mechanisms. The evidence shows password policies but no MFA enforcement configuration, which is a critical gap for access security.', '2026-10-08 10:00:00+00')
ON CONFLICT DO NOTHING;

INSERT INTO remediation_tasks (id, finding_id, organization_id, title, description, assignee, status, priority, due_date) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Formalize RBAC Matrix Review Process (Sample)', 'Establish a quarterly review cycle for the RBAC matrix with documented approvals and sign-offs.', 'Sarah Chen', 'in_progress', 'high', '2026-11-15'),
  ('b1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Enforce Deployment Approval Gates (Sample)', 'Configure CI/CD pipeline to require explicit approval before production deployments.', 'Marcus Lee', 'open', 'medium', '2026-11-30'),
  ('b1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Schedule Security Awareness Training (Sample)', 'Coordinate with HR to schedule the next round of security awareness training for all employees.', 'HR Team', 'open', 'medium', '2026-11-10'),
  ('b1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Complete Q3 Access Review and Remediation (Sample)', 'Finish the Q3 access review, document findings, and remediate any excessive permissions.', 'Sarah Chen', 'in_progress', 'high', '2026-11-01'),
  ('b1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Enforce MFA for All User Accounts (Sample)', 'Enable mandatory MFA enrollment for all users in the identity provider and verify enforcement.', 'Marcus Lee', 'open', 'urgent', '2026-10-25')
ON CONFLICT DO NOTHING;

INSERT INTO ai_analysis_runs (id, organization_id, run_type, status, input_summary, result_summary, findings_count, started_at, completed_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'gap_analysis', 'completed', 'Analyzed 10 evidence items across 13 controls in SOC 2 and ISO 27001 frameworks.', 'Identified 5 findings: 1 critical, 2 high, 2 medium. Key gaps in MFA enforcement, RBAC review, and change management approvals.', 5, '2026-10-07 08:00:00+00', '2026-10-08 10:30:00+00')
ON CONFLICT DO NOTHING;

INSERT INTO audit_events (organization_id, actor, action, entity_type, entity_id, metadata) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'system', 'organization_created', 'organization', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '{"source": "seed"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'system', 'evidence_uploaded', 'evidence', 'e1000000-0000-0000-0000-000000000001', '{"source_type": "configuration", "is_sample": true}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'system', 'evidence_verified', 'evidence', 'e1000000-0000-0000-0000-000000000001', '{"verifier": "system"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'system', 'evidence_uploaded', 'evidence', 'e1000000-0000-0000-0000-000000000002', '{"source_type": "screenshot", "is_sample": true}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'system', 'evidence_verified', 'evidence', 'e1000000-0000-0000-0000-000000000002', '{"verifier": "system"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'system', 'evidence_uploaded', 'evidence', 'e1000000-0000-0000-0000-000000000004', '{"source_type": "api_export", "is_sample": true}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AI Analyst', 'ai_analysis_completed', 'ai_analysis_run', 'a1000000-0000-0000-0000-000000000001', '{"findings_count": 5, "run_type": "gap_analysis"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AI Analyst', 'finding_created', 'finding', 'd1000000-0000-0000-0000-000000000005', '{"severity": "critical"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah Chen', 'task_status_changed', 'remediation_task', 'b1000000-0000-0000-0000-000000000001', '{"from": "open", "to": "in_progress"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah Chen', 'task_status_changed', 'remediation_task', 'b1000000-0000-0000-0000-000000000004', '{"from": "open", "to": "in_progress"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AI Analyst', 'finding_created', 'finding', 'd1000000-0000-0000-0000-000000000001', '{"severity": "high"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AI Analyst', 'finding_created', 'finding', 'd1000000-0000-0000-0000-000000000002', '{"severity": "medium"}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'system', 'finding_acknowledged', 'finding', 'd1000000-0000-0000-0000-000000000003', '{"acknowledged_by": "Sarah Chen"}'::jsonb)
ON CONFLICT DO NOTHING;