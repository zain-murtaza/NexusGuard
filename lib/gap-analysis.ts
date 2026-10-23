import type { ControlWithFramework, EvidenceWithControl, Severity } from './types';

export interface GapRule {
  id: string;
  description: string;
  severity: Severity;
  reasoning: string;
}

export interface GapFinding {
  control_id: string;
  title: string;
  description: string;
  severity: Severity;
  reasoning: string;
  rule_id: string;
}

export interface GapAnalysisResult {
  findings: GapFinding[];
  controlsAnalyzed: number;
  controlsCovered: number;
  controlsGapped: number;
  engineVersion: string;
  ruleVersion: string;
}

export const ENGINE_VERSION = 'rules-v1';
export const RULE_VERSION = '2026.10.01';

function mapSeverity(category: string | null): Severity {
  if (!category) return 'medium';
  const lower = category.toLowerCase();
  if (lower.includes('access') || lower.includes('encryption') || lower.includes('auth')) return 'critical';
  if (lower.includes('audit') || lower.includes('logging') || lower.includes('monitor')) return 'high';
  if (lower.includes('incident') || lower.includes('vulnerability')) return 'high';
  if (lower.includes('policy') || lower.includes('training')) return 'low';
  return 'medium';
}

export function runGapAnalysis(
  controls: ControlWithFramework[],
  evidence: EvidenceWithControl[]
): GapAnalysisResult {
  const evidenceByControl = new Map<string, EvidenceWithControl[]>();
  for (const ev of evidence) {
    if (ev.control_id) {
      const list = evidenceByControl.get(ev.control_id) ?? [];
      list.push(ev);
      evidenceByControl.set(ev.control_id, list);
    }
  }

  const findings: GapFinding[] = [];
  let controlsCovered = 0;
  let controlsGapped = 0;

  for (const control of controls) {
    const linkedEvidence = evidenceByControl.get(control.id) ?? [];
    const hasVerified = linkedEvidence.some((e) => e.status === 'verified');
    const hasCollected = linkedEvidence.some((e) => e.status === 'collected');
    const hasExpired = linkedEvidence.some((e) => e.status === 'expired');
    const hasRejected = linkedEvidence.some((e) => e.status === 'rejected');
    const allExpiredOrRejected = linkedEvidence.length > 0 && linkedEvidence.every((e) => e.status === 'expired' || e.status === 'rejected');

    if (hasVerified) {
      controlsCovered++;
      continue;
    }

    const severity = mapSeverity(control.category);

    if (linkedEvidence.length === 0) {
      controlsGapped++;
      findings.push({
        control_id: control.id,
        title: `No evidence for control ${control.reference}`,
        description: `Control "${control.title}" (${control.reference}) has no evidence items linked. This control may have an unaddressed coverage gap.`,
        severity,
        reasoning: `Rule "no-evidence": control ${control.reference} has zero linked evidence items. A control without any evidence cannot be assessed for compliance.`,
        rule_id: 'no-evidence',
      });
    } else if (allExpiredOrRejected) {
      controlsGapped++;
      const expiredCount = linkedEvidence.filter((e) => e.status === 'expired').length;
      const rejectedCount = linkedEvidence.filter((e) => e.status === 'rejected').length;
      findings.push({
        control_id: control.id,
        title: `All evidence for ${control.reference} is expired or rejected`,
        description: `Control "${control.title}" (${control.reference}) has ${linkedEvidence.length} evidence item(s), but all are expired (${expiredCount}) or rejected (${rejectedCount}). Fresh evidence is needed.`,
        severity,
        reasoning: `Rule "stale-evidence": control ${control.reference} has ${linkedEvidence.length} evidence items but none are in a valid state. Expired: ${expiredCount}, Rejected: ${rejectedCount}. Coverage cannot be confirmed.`,
        rule_id: 'stale-evidence',
      });
    } else if (hasExpired && !hasVerified && !hasCollected) {
      controlsGapped++;
      findings.push({
        control_id: control.id,
        title: `Expired evidence for ${control.reference}`,
        description: `Control "${control.title}" (${control.reference}) has expired evidence that needs to be recollected.`,
        severity,
        reasoning: `Rule "expired-only": control ${control.reference} has expired evidence with no verified or collected evidence to replace it.`,
        rule_id: 'expired-only',
      });
    } else if (hasCollected && !hasVerified) {
      controlsGapped++;
      findings.push({
        control_id: control.id,
        title: `Evidence for ${control.reference} not yet verified`,
        description: `Control "${control.title}" (${control.reference}) has collected evidence that has not been verified. Verification is needed to confirm control coverage.`,
        severity: severity === 'critical' ? 'high' : severity,
        reasoning: `Rule "unverified-evidence": control ${control.reference} has ${linkedEvidence.filter((e) => e.status === 'collected').length} collected evidence item(s) but none verified. Collected evidence has not been independently confirmed.`,
        rule_id: 'unverified-evidence',
      });
    } else {
      controlsCovered++;
    }
  }

  return {
    findings,
    controlsAnalyzed: controls.length,
    controlsCovered,
    controlsGapped,
    engineVersion: ENGINE_VERSION,
    ruleVersion: RULE_VERSION,
  };
}
