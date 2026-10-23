import { runGapAnalysis, ENGINE_VERSION, RULE_VERSION } from '../gap-analysis';
import type { ControlWithFramework, EvidenceWithControl } from '../types';

function makeControl(id: string, category: string | null = null): ControlWithFramework {
  return {
    id,
    framework_id: 'fw-1',
    reference: `CTRL-${id.slice(-3)}`,
    title: `Control ${id}`,
    description: 'Test control',
    category,
    status: 'active',
    created_at: '2026-01-01',
  };
}

function makeEvidence(
  id: string,
  controlId: string | null,
  status: 'collected' | 'verified' | 'expired' | 'rejected'
): EvidenceWithControl {
  return {
    id,
    organization_id: 'org-1',
    control_id: controlId,
    title: `Evidence ${id}`,
    description: null,
    source_type: 'Manual',
    source_reference: null,
    collection_method: 'Manual upload',
    status,
    collected_at: '2026-01-01',
    verified_at: status === 'verified' ? '2026-01-02' : null,
    is_sample: false,
    created_at: '2026-01-01',
  };
}

describe('runGapAnalysis', () => {
  it('returns zero findings when all controls have verified evidence', () => {
    const controls = [makeControl('c001'), makeControl('c002')];
    const evidence = [
      makeEvidence('e001', 'c001', 'verified'),
      makeEvidence('e002', 'c002', 'verified'),
    ];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings).toHaveLength(0);
    expect(result.controlsAnalyzed).toBe(2);
    expect(result.controlsCovered).toBe(2);
    expect(result.controlsGapped).toBe(0);
  });

  it('creates a finding for controls with no evidence', () => {
    const controls = [makeControl('c001'), makeControl('c002')];
    const evidence = [makeEvidence('e001', 'c001', 'verified')];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].rule_id).toBe('no-evidence');
    expect(result.findings[0].control_id).toBe('c002');
    expect(result.controlsGapped).toBe(1);
  });

  it('creates a finding when all evidence is expired or rejected', () => {
    const controls = [makeControl('c001')];
    const evidence = [
      makeEvidence('e001', 'c001', 'expired'),
      makeEvidence('e002', 'c001', 'rejected'),
    ];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].rule_id).toBe('stale-evidence');
  });

  it('creates a finding for collected but unverified evidence', () => {
    const controls = [makeControl('c001')];
    const evidence = [makeEvidence('e001', 'c001', 'collected')];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].rule_id).toBe('unverified-evidence');
  });

  it('does not create a finding when verified evidence exists alongside expired', () => {
    const controls = [makeControl('c001')];
    const evidence = [
      makeEvidence('e001', 'c001', 'verified'),
      makeEvidence('e002', 'c001', 'expired'),
    ];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings).toHaveLength(0);
    expect(result.controlsCovered).toBe(1);
  });

  it('assigns critical severity for access control categories', () => {
    const controls = [makeControl('c001', 'Access Control')];
    const evidence: EvidenceWithControl[] = [];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings[0].severity).toBe('critical');
  });

  it('assigns high severity for audit/logging categories', () => {
    const controls = [makeControl('c001', 'Audit Logging')];
    const evidence: EvidenceWithControl[] = [];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings[0].severity).toBe('high');
  });

  it('assigns low severity for policy/training categories', () => {
    const controls = [makeControl('c001', 'Security Policy')];
    const evidence: EvidenceWithControl[] = [];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings[0].severity).toBe('low');
  });

  it('assigns medium severity for uncategorized controls', () => {
    const controls = [makeControl('c001', null)];
    const evidence: EvidenceWithControl[] = [];
    const result = runGapAnalysis(controls, evidence);
    expect(result.findings[0].severity).toBe('medium');
  });

  it('includes engine and rule version metadata', () => {
    const result = runGapAnalysis([], []);
    expect(result.engineVersion).toBe(ENGINE_VERSION);
    expect(result.ruleVersion).toBe(RULE_VERSION);
  });

  it('is deterministic — same inputs always produce same outputs', () => {
    const controls = [makeControl('c001', 'Access Control'), makeControl('c002', 'Audit Logging')];
    const evidence = [makeEvidence('e001', 'c001', 'collected')];
    const result1 = runGapAnalysis(controls, evidence);
    const result2 = runGapAnalysis(controls, evidence);
    expect(result1).toEqual(result2);
  });

  it('handles empty controls list gracefully', () => {
    const result = runGapAnalysis([], [makeEvidence('e001', null, 'verified')]);
    expect(result.findings).toHaveLength(0);
    expect(result.controlsAnalyzed).toBe(0);
    expect(result.controlsCovered).toBe(0);
  });

  it('counts controls with evidence covering multiple controls correctly', () => {
    const controls = [makeControl('c001'), makeControl('c002'), makeControl('c003')];
    const evidence = [
      makeEvidence('e001', 'c001', 'verified'),
      makeEvidence('e002', 'c001', 'collected'),
      makeEvidence('e003', 'c002', 'verified'),
    ];
    const result = runGapAnalysis(controls, evidence);
    expect(result.controlsCovered).toBe(2);
    expect(result.controlsGapped).toBe(1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].control_id).toBe('c003');
  });
});
