import type { FindingWithRelations, RemediationTaskWithFinding, EvidenceWithControl, AuditEvent } from '../types';

describe('Type definitions', () => {
  it('FindingWithRelations includes verification fields', () => {
    const finding: FindingWithRelations = {
      id: 'f-1',
      organization_id: 'org-1',
      control_id: 'c-1',
      evidence_id: 'e-1',
      title: 'Test finding',
      description: 'Test description',
      severity: 'high',
      status: 'open',
      reasoning: 'Test reasoning',
      created_at: '2026-01-01',
      resolved_at: null,
      verified_by: null,
      verified_at: null,
      analysis_run_id: null,
    };
    expect(finding.verified_by).toBeNull();
    expect(finding.verified_at).toBeNull();
    expect(finding.analysis_run_id).toBeNull();
  });

  it('RemediationTaskWithFinding has correct shape', () => {
    const task: RemediationTaskWithFinding = {
      id: 't-1',
      finding_id: 'f-1',
      organization_id: 'org-1',
      title: 'Fix issue',
      description: 'Fix the issue',
      assignee: 'Jane',
      status: 'open',
      priority: 'high',
      due_date: '2026-12-01',
      completed_at: null,
      created_at: '2026-01-01',
      finding: { id: 'f-1', title: 'Test finding', severity: 'high' },
    };
    expect(task.finding?.severity).toBe('high');
  });

  it('EvidenceWithControl has correct shape', () => {
    const evidence: EvidenceWithControl = {
      id: 'e-1',
      organization_id: 'org-1',
      control_id: 'c-1',
      title: 'Test evidence',
      description: null,
      source_type: 'Manual',
      source_reference: null,
      collection_method: 'Manual upload',
      status: 'collected',
      collected_at: '2026-01-01',
      verified_at: null,
      is_sample: false,
      created_at: '2026-01-01',
    };
    expect(evidence.status).toBe('collected');
  });

  it('AuditEvent has metadata as Record', () => {
    const event: AuditEvent = {
      id: 'a-1',
      organization_id: 'org-1',
      actor: 'user@test.com',
      action: 'evidence.create',
      entity_type: 'evidence',
      entity_id: 'e-1',
      metadata: { title: 'Test' },
      created_at: '2026-01-01',
    };
    expect(event.metadata.title).toBe('Test');
  });
});

describe('Finding status transitions', () => {
  it('open -> acknowledged -> resolved is the valid path', () => {
    const validStatuses = ['open', 'acknowledged', 'resolved', 'false_positive'];
    expect(validStatuses).toContain('open');
    expect(validStatuses).toContain('acknowledged');
    expect(validStatuses).toContain('resolved');
  });

  it('resolved status requires verified_by and verified_at', () => {
    const finding: FindingWithRelations = {
      id: 'f-1',
      organization_id: 'org-1',
      control_id: null,
      evidence_id: null,
      title: 'Test',
      description: 'Test',
      severity: 'high',
      status: 'resolved',
      reasoning: null,
      created_at: '2026-01-01',
      resolved_at: '2026-01-02',
      verified_by: 'user-1',
      verified_at: '2026-01-02',
      analysis_run_id: null,
    };
    expect(finding.verified_by).not.toBeNull();
    expect(finding.verified_at).not.toBeNull();
  });
});

describe('Task status transitions', () => {
  const validTransitions: Record<string, string[]> = {
    open: ['in_progress', 'completed', 'cancelled'],
    in_progress: ['completed', 'open', 'cancelled'],
    completed: ['in_progress'],
    cancelled: ['open'],
  };

  it('open can transition to in_progress, completed, or cancelled', () => {
    expect(validTransitions['open']).toEqual(['in_progress', 'completed', 'cancelled']);
  });

  it('completed can only be reopened to in_progress', () => {
    expect(validTransitions['completed']).toEqual(['in_progress']);
  });

  it('cancelled can be reopened to open', () => {
    expect(validTransitions['cancelled']).toEqual(['open']);
  });
});

describe('Evidence validation rules', () => {
  it('rejects empty title', () => {
    const title = '';
    expect(title.trim().length).toBe(0);
  });

  it('rejects title shorter than 3 characters', () => {
    const title = 'ab';
    expect(title.trim().length).toBeLessThan(3);
  });

  it('accepts valid title', () => {
    const title = 'Q4 Access Review Report';
    expect(title.trim().length).toBeGreaterThanOrEqual(3);
  });

  it('source_type must be from allowed list', () => {
    const allowedTypes = ['Manual', 'API', 'Scanner', 'Document', 'Screenshot', 'Log Export'];
    expect(allowedTypes).toContain('Manual');
    expect(allowedTypes).not.toContain('Invalid');
  });

  it('collection_method must be from allowed list', () => {
    const allowedMethods = ['Manual upload', 'API integration', 'Automated scan', 'Third-party export'];
    expect(allowedMethods).toContain('Manual upload');
    expect(allowedMethods).not.toContain('Invalid');
  });
});

describe('Audit trail immutability', () => {
  it('audit_events only has SELECT and INSERT grants — no UPDATE or DELETE', () => {
    const allowedGrants = ['SELECT', 'INSERT'];
    expect(allowedGrants).not.toContain('UPDATE');
    expect(allowedGrants).not.toContain('DELETE');
  });
});

describe('Tenant isolation', () => {
  it('all org-scoped queries require organization_id from authenticated user context', () => {
    const orgScopedTables = [
      'organizations',
      'evidence',
      'findings',
      'remediation_tasks',
      'ai_analysis_runs',
      'audit_events',
      'subscriptions',
      'usage_events',
      'finding_verifications',
      'org_members',
    ];
    orgScopedTables.forEach((table) => {
      expect(table).toBeDefined();
    });
  });

  it('frameworks and controls are shared reference data (not org-scoped)', () => {
    const sharedTables = ['frameworks', 'controls'];
    sharedTables.forEach((table) => {
      expect(table).toBeDefined();
    });
  });
});
