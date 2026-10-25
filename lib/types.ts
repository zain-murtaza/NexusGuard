export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type FindingStatus = 'open' | 'acknowledged' | 'resolved' | 'false_positive';
export type EvidenceStatus = 'collected' | 'verified' | 'expired' | 'rejected';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AIRunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due';
export type OrgRole = 'admin' | 'member' | 'viewer';
export type VerificationResult = 'approved' | 'rejected';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_demo: boolean;
  created_at: string;
}

export interface OrgMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrgRole;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface Framework {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

export interface Control {
  id: string;
  framework_id: string;
  reference: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  created_at: string;
}

export interface ControlWithFramework extends Control {
  framework?: Pick<Framework, 'id' | 'name' | 'code'>;
  evidence_count?: number;
}

export interface Evidence {
  id: string;
  organization_id: string;
  control_id: string | null;
  title: string;
  description: string | null;
  source_type: string | null;
  source_reference: string | null;
  collection_method: string | null;
  status: EvidenceStatus;
  collected_at: string;
  verified_at: string | null;
  is_sample: boolean;
  created_at: string;
}

export interface EvidenceWithControl extends Evidence {
  control?: Pick<Control, 'id' | 'reference' | 'title'> | null;
}

export interface Finding {
  id: string;
  organization_id: string;
  control_id: string | null;
  evidence_id: string | null;
  title: string;
  description: string;
  severity: Severity;
  status: FindingStatus;
  reasoning: string | null;
  created_at: string;
  resolved_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  analysis_run_id: string | null;
}

export interface FindingWithRelations extends Finding {
  control?: Pick<Control, 'id' | 'reference' | 'title'> | null;
  evidence?: Pick<Evidence, 'id' | 'title'> | null;
}

export interface RemediationTask {
  id: string;
  finding_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RemediationTaskWithFinding extends RemediationTask {
  finding?: Pick<Finding, 'id' | 'title' | 'severity'>;
}

export interface AIReviewContent {
  review_summary: string;
  evidence_examined: string[];
  evidence_gaps_and_uncertainties: string;
  recommended_next_actions: string[];
  limitations: string;
}

export interface AIAnalysisRun {
  id: string;
  organization_id: string;
  run_type: string;
  status: AIRunStatus;
  input_summary: string | null;
  result_summary: string | null;
  findings_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  engine_version: string;
  rule_version: string;
  controls_analyzed: number;
  controls_covered: number;
  controls_gapped: number;
  finding_id: string | null;
  provider: string | null;
  model_name: string | null;
  review_content: AIReviewContent | null;
  thread_id: string | null;
}

export type AIAnalysisRunWithReview = AIAnalysisRun;

export interface AuditEvent {
  id: string;
  organization_id: string;
  actor: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  seats: number;
  current_period_end: string | null;
  created_at: string;
}

export interface UsageEvent {
  id: string;
  organization_id: string;
  event_type: string;
  count: number;
  created_at: string;
}

export interface FindingVerification {
  id: string;
  finding_id: string;
  organization_id: string;
  verified_by: string;
  result: VerificationResult;
  notes: string | null;
  created_at: string;
}

export interface GitHubSignal {
  key: string;
  label: string;
  detected: boolean;
  sourceUrl: string | null;
  detail: string;
  category: 'policy' | 'code-review' | 'dependencies' | 'ci-cd' | 'licensing' | 'documentation';
  notChecked: boolean;
}

export interface GitHubInspectionResult {
  repository: {
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    defaultBranch: string;
    url: string;
    isPrivate: boolean;
  };
  signals: GitHubSignal[];
  inspectedAt: string;
  rateLimitRemaining: number | null;
}

export interface DashboardSummary {
  totalControls: number;
  totalEvidence: number;
  verifiedEvidence: number;
  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  totalTasks: number;
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  coveragePercentage: number;
}
