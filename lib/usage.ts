import { SupabaseClient } from '@supabase/supabase-js';
import { getPlanConfig, PlanConfig } from './plans';

export interface UsagePeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface UsageSummary {
  aiReviews: number;
  githubInspections: number;
  plan: PlanConfig;
  period: UsagePeriod;
  aiReviewsLimit: number;
  githubInspectionsLimit: number;
  aiReviewsRemaining: number;
  githubInspectionsRemaining: number;
  aiReviewsExceeded: boolean;
  githubInspectionsExceeded: boolean;
}

export function getCurrentMonthPeriod(now: Date = new Date()): UsagePeriod {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    start,
    end,
    label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

export async function getOrgPlan(supabase: SupabaseClient, orgId: string): Promise<PlanConfig> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('organization_id', orgId)
    .maybeSingle();

  return getPlanConfig(subscription?.plan ?? 'starter');
}

export async function getMonthlyUsage(
  supabase: SupabaseClient,
  orgId: string,
  period?: UsagePeriod
): Promise<{ aiReviews: number; githubInspections: number }> {
  const { start, end } = period ?? getCurrentMonthPeriod();

  const { data, error } = await supabase
    .from('usage_events')
    .select('event_type, count')
    .eq('organization_id', orgId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error || !data) {
    return { aiReviews: 0, githubInspections: 0 };
  }

  let aiReviews = 0;
  let githubInspections = 0;

  for (const row of data as { event_type: string; count: number }[]) {
    if (row.event_type === 'ai_review') {
      aiReviews += row.count;
    } else if (row.event_type === 'github_inspection') {
      githubInspections += row.count;
    }
  }

  return { aiReviews, githubInspections };
}

export async function getUsageSummary(
  supabase: SupabaseClient,
  orgId: string
): Promise<UsageSummary> {
  const plan = await getOrgPlan(supabase, orgId);
  const period = getCurrentMonthPeriod();
  const usage = await getMonthlyUsage(supabase, orgId, period);

  return {
    ...usage,
    plan,
    period,
    aiReviewsLimit: plan.limits.aiReviewsPerMonth,
    githubInspectionsLimit: plan.limits.githubInspectionsPerMonth,
    aiReviewsRemaining: Math.max(0, plan.limits.aiReviewsPerMonth - usage.aiReviews),
    githubInspectionsRemaining: Math.max(0, plan.limits.githubInspectionsPerMonth - usage.githubInspections),
    aiReviewsExceeded: usage.aiReviews >= plan.limits.aiReviewsPerMonth,
    githubInspectionsExceeded: usage.githubInspections >= plan.limits.githubInspectionsPerMonth,
  };
}

export async function recordUsage(
  supabase: SupabaseClient,
  orgId: string,
  eventType: 'ai_review' | 'github_inspection'
): Promise<void> {
  const { error } = await supabase.from('usage_events').insert({
    organization_id: orgId,
    event_type: eventType,
    count: 1,
  });

  if (error) throw error;
}

export interface LimitCheckResult {
  allowed: boolean;
  usage: UsageSummary;
  limitType: 'ai_review' | 'github_inspection' | null;
  message: string | null;
}

export async function checkLimit(
  supabase: SupabaseClient,
  orgId: string,
  limitType: 'ai_review' | 'github_inspection'
): Promise<LimitCheckResult> {
  const usage = await getUsageSummary(supabase, orgId);

  if (limitType === 'ai_review' && usage.aiReviewsExceeded) {
    return {
      allowed: false,
      usage,
      limitType,
      message: `Your organization has reached the monthly AI review limit (${usage.aiReviewsLimit}) on the ${usage.plan.displayName} plan.`,
    };
  }

  if (limitType === 'github_inspection' && usage.githubInspectionsExceeded) {
    return {
      allowed: false,
      usage,
      limitType,
      message: `Your organization has reached the monthly GitHub inspection limit (${usage.githubInspectionsLimit}) on the ${usage.plan.displayName} plan.`,
    };
  }

  return {
    allowed: true,
    usage,
    limitType: null,
    message: null,
  };
}
