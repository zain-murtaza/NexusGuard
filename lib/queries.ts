'use client';

import { supabase } from './supabase-client';
import type {
  Organization,
  Framework,
  ControlWithFramework,
  EvidenceWithControl,
  FindingWithRelations,
  RemediationTaskWithFinding,
  AIAnalysisRun,
  AuditEvent,
  Subscription,
  DashboardSummary,
  Evidence,
} from './types';

export async function fetchOrganization(orgId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();
  if (error) throw error;
  return data as Organization | null;
}

export async function fetchSubscription(orgId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();
  if (error) throw error;
  return data as Subscription | null;
}

export async function fetchFrameworks(): Promise<Framework[]> {
  const { data, error } = await supabase
    .from('frameworks')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data as Framework[]) ?? [];
}

export async function fetchControls(): Promise<ControlWithFramework[]> {
  const { data, error } = await supabase
    .from('controls')
    .select('*, framework:frameworks(id, name, code)')
    .order('reference');
  if (error) throw error;
  return (data as ControlWithFramework[]) ?? [];
}

export async function fetchEvidence(orgId: string): Promise<EvidenceWithControl[]> {
  const { data, error } = await supabase
    .from('evidence')
    .select('*, control:controls(id, reference, title)')
    .eq('organization_id', orgId)
    .order('collected_at', { ascending: false });
  if (error) throw error;
  return (data as EvidenceWithControl[]) ?? [];
}

export async function fetchFindings(orgId: string): Promise<FindingWithRelations[]> {
  const { data, error } = await supabase
    .from('findings')
    .select('*, control:controls(id, reference, title), evidence:evidence(id, title)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as FindingWithRelations[]) ?? [];
}

export async function fetchRemediationTasks(orgId: string): Promise<RemediationTaskWithFinding[]> {
  const { data, error } = await supabase
    .from('remediation_tasks')
    .select('*, finding:findings(id, title, severity)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RemediationTaskWithFinding[]) ?? [];
}

export async function fetchAIAnalysisRuns(orgId: string): Promise<AIAnalysisRun[]> {
  const { data, error } = await supabase
    .from('ai_analysis_runs')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as AIAnalysisRun[]) ?? [];
}

export async function fetchAIReviewsForFinding(orgId: string, findingId: string): Promise<AIAnalysisRun[]> {
  const { data, error } = await supabase
    .from('ai_analysis_runs')
    .select('*')
    .eq('organization_id', orgId)
    .eq('finding_id', findingId)
    .eq('run_type', 'ai_review')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as AIAnalysisRun[]) ?? [];
}

export interface MonthlyUsage {
  aiReviews: number;
  githubInspections: number;
}

export async function fetchMonthlyUsage(orgId: string): Promise<MonthlyUsage> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data, error } = await supabase
    .from('usage_events')
    .select('event_type, count')
    .eq('organization_id', orgId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error || !data) return { aiReviews: 0, githubInspections: 0 };

  let aiReviews = 0;
  let githubInspections = 0;
  for (const row of data as { event_type: string; count: number }[]) {
    if (row.event_type === 'ai_review') aiReviews += row.count;
    if (row.event_type === 'github_inspection') githubInspections += row.count;
  }
  return { aiReviews, githubInspections };
}

export async function fetchAuditEvents(orgId: string, limit = 50): Promise<AuditEvent[]> {
  const { data, error } = await supabase
    .from('audit_events')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AuditEvent[]) ?? [];
}

export async function fetchDashboardSummary(orgId: string): Promise<DashboardSummary> {
  const [controlsRes, evidenceRes, findingsRes, tasksRes] = await Promise.all([
    supabase.from('controls').select('id', { count: 'exact', head: true }),
    supabase.from('evidence').select('id, status, control_id', { count: 'exact' }).eq('organization_id', orgId),
    supabase.from('findings').select('id, severity, status').eq('organization_id', orgId),
    supabase.from('remediation_tasks').select('id, status').eq('organization_id', orgId),
  ]);

  const totalControls = controlsRes.count ?? 0;
  const evidence = (evidenceRes.data as { id: string; status: string; control_id: string | null }[]) ?? [];
  const totalEvidence = evidence.length;
  const verifiedEvidence = evidence.filter((e) => e.status === 'verified').length;
  const findings = (findingsRes.data as { id: string; severity: string; status: string }[]) ?? [];
  const totalFindings = findings.length;
  const openFindings = findings.filter((f) => f.status === 'open').length;
  const criticalFindings = findings.filter((f) => f.severity === 'critical').length;
  const tasks = (tasksRes.data as { id: string; status: string }[]) ?? [];
  const totalTasks = tasks.length;
  const openTasks = tasks.filter((t) => t.status === 'open').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  const controlsWithEvidence = new Set(
    evidence.filter((e) => e.control_id !== null).map((e) => e.control_id as string)
  );
  const coveragePercentage = totalControls > 0
    ? Math.round((controlsWithEvidence.size / totalControls) * 100)
    : 0;

  return {
    totalControls,
    totalEvidence,
    verifiedEvidence,
    totalFindings,
    openFindings,
    criticalFindings,
    totalTasks,
    openTasks,
    inProgressTasks,
    completedTasks,
    coveragePercentage,
  };
}

export async function createAuditEvent(
  orgId: string,
  actor: string,
  action: string,
  entityType: string | null,
  entityId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.from('audit_events').insert({
    organization_id: orgId,
    actor,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? {},
  });
}

export async function insertEvidence(
  orgId: string,
  actor: string,
  payload: {
    control_id: string | null;
    title: string;
    description: string | null;
    source_type: string;
    source_reference: string | null;
    collection_method: string;
  }
): Promise<Evidence | null> {
  const { data, error } = await supabase
    .from('evidence')
    .insert({
      organization_id: orgId,
      control_id: payload.control_id,
      title: payload.title,
      description: payload.description,
      source_type: payload.source_type,
      source_reference: payload.source_reference,
      collection_method: payload.collection_method,
      status: 'collected',
      collected_at: new Date().toISOString(),
      is_sample: false,
    })
    .select('*')
    .single();

  if (error) throw error;

  await createAuditEvent(orgId, actor, 'evidence.create', 'evidence', data.id, { title: payload.title });

  return data as Evidence;
}

export async function createRemediationTask(
  orgId: string,
  actor: string,
  payload: {
    finding_id: string;
    title: string;
    description: string | null;
    assignee: string | null;
    priority: string;
    due_date: string | null;
  }
): Promise<RemediationTaskWithFinding | null> {
  const { data, error } = await supabase
    .from('remediation_tasks')
    .insert({
      organization_id: orgId,
      finding_id: payload.finding_id,
      title: payload.title,
      description: payload.description,
      assignee: payload.assignee,
      status: 'open',
      priority: payload.priority,
      due_date: payload.due_date,
    })
    .select('*, finding:findings(id, title, severity)')
    .single();

  if (error) throw error;

  await createAuditEvent(orgId, actor, 'remediation.create', 'remediation_task', data.id, { title: payload.title });

  return data as RemediationTaskWithFinding;
}

export async function updateTaskStatus(
  orgId: string,
  actor: string,
  taskId: string,
  newStatus: string
): Promise<void> {
  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('remediation_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('organization_id', orgId);

  if (error) throw error;

  await createAuditEvent(orgId, actor, 'remediation.status_change', 'remediation_task', taskId, { new_status: newStatus });
}

export async function acknowledgeFinding(
  orgId: string,
  actor: string,
  findingId: string
): Promise<void> {
  const { error } = await supabase
    .from('findings')
    .update({ status: 'acknowledged' })
    .eq('id', findingId)
    .eq('organization_id', orgId);

  if (error) throw error;

  await createAuditEvent(orgId, actor, 'finding.acknowledge', 'finding', findingId);
}

export async function verifyFinding(
  orgId: string,
  actor: string,
  actorId: string,
  findingId: string,
  result: 'approved' | 'rejected',
  notes: string | null
): Promise<void> {
  const newStatus = result === 'approved' ? 'resolved' : 'open';
  const updates: Record<string, unknown> = {
    status: newStatus,
    verified_by: actorId,
    verified_at: new Date().toISOString(),
  };
  if (result === 'approved') {
    updates.resolved_at = new Date().toISOString();
  } else {
    updates.resolved_at = null;
  }

  const { error: findingError } = await supabase
    .from('findings')
    .update(updates)
    .eq('id', findingId)
    .eq('organization_id', orgId);

  if (findingError) throw findingError;

  const { error: verificationError } = await supabase
    .from('finding_verifications')
    .insert({
      finding_id: findingId,
      organization_id: orgId,
      verified_by: actorId,
      result,
      notes,
    });

  if (verificationError) throw verificationError;

  await createAuditEvent(orgId, actor, 'finding.verify', 'finding', findingId, { result, notes });
}
