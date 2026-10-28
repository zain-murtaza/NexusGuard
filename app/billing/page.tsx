'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Check, Zap, Building2, Sparkles, Search, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { useAppData } from '@/hooks/use-app-data';
import { LoadingState, ErrorState } from '@/components/state';
import { fetchMonthlyUsage, MonthlyUsage } from '@/lib/queries';
import { PLAN_LIST, getPlanConfig } from '@/lib/plans';

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  starter: CreditCard,
  pro: Zap,
  team: Building2,
};

export default function BillingPage() {
  const { subscription, organization, loading, error, refresh } = useAppData();
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    async function loadUsage() {
      setUsageLoading(true);
      try {
        const u = await fetchMonthlyUsage(organization!.id);
        if (!cancelled) setUsage(u);
      } catch {
        if (!cancelled) setUsage({ aiReviews: 0, githubInspections: 0 });
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    }
    loadUsage();
    return () => { cancelled = true; };
  }, [organization?.id, refresh]);

  if (loading) return <div className="p-6"><LoadingState label="Loading billing..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  const currentPlanName = subscription?.plan ?? 'starter';
  const currentPlan = getPlanConfig(currentPlanName);
  const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const aiReviewsUsed = usage?.aiReviews ?? 0;
  const githubInspectionsUsed = usage?.githubInspections ?? 0;
  const aiReviewsLimit = currentPlan.limits.aiReviewsPerMonth;
  const githubInspectionsLimit = currentPlan.limits.githubInspectionsPerMonth;
  const aiReviewsPercent = aiReviewsLimit > 0 ? Math.min(100, (aiReviewsUsed / aiReviewsLimit) * 100) : 0;
  const githubInspectionsPercent = githubInspectionsLimit > 0 ? Math.min(100, (githubInspectionsUsed / githubInspectionsLimit) * 100) : 0;
  const aiReviewsExceeded = aiReviewsUsed >= aiReviewsLimit;
  const githubInspectionsExceeded = githubInspectionsUsed >= githubInspectionsLimit;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Billing"
        description="Manage your subscription plan and usage"
      />
      {organization?.is_demo && <DemoBanner />}

      {/* Current Plan Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Current Plan</h3>
                <Badge className="bg-primary/15 text-primary ring-1 ring-primary/30">
                  {currentPlan.displayName}
                </Badge>
                <Badge variant="secondary">{subscription?.status ?? 'active'}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {currentPlan.priceLabel} {currentPlan.price > 0 ? `· ${subscription?.seats ?? 1} seat(s)` : ''}
                {subscription?.current_period_end && ` · Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="text-sm font-medium text-foreground">{organization?.name ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Usage Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Monthly Usage — {currentMonthLabel}</CardTitle>
            {!usageLoading && (
              <span className="text-xs text-muted-foreground">Resets on the 1st of next month</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {usageLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading usage...
            </div>
          ) : (
            <>
              {/* AI Reviews Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">AI Reviews</span>
                  </div>
                  <span className={`text-sm font-medium ${aiReviewsExceeded ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {aiReviewsUsed} / {aiReviewsLimit}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${aiReviewsPercent}%` }}
                  />
                </div>
                {aiReviewsExceeded ? (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Monthly limit reached. Upgrade your plan for more AI reviews.
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {Math.max(0, aiReviewsLimit - aiReviewsUsed)} remaining this month
                  </p>
                )}
              </div>

              {/* GitHub Inspections Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">GitHub Inspections</span>
                  </div>
                  <span className={`text-sm font-medium ${githubInspectionsExceeded ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {githubInspectionsUsed} / {githubInspectionsLimit}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${githubInspectionsPercent}%` }}
                  />
                </div>
                {githubInspectionsExceeded ? (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Monthly limit reached. Upgrade your plan for more GitHub inspections.
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {Math.max(0, githubInspectionsLimit - githubInspectionsUsed)} remaining this month
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Available Plans</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLAN_LIST.map((plan) => {
            const Icon = planIcons[plan.name] ?? CreditCard;
            const isCurrent = plan.name === currentPlan.name;
            return (
              <Card key={plan.name} className={isCurrent ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isCurrent ? 'bg-primary/15' : 'bg-secondary'}`}>
                      <Icon className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <CardTitle className="text-sm">{plan.displayName}</CardTitle>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{plan.priceLabel}</p>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? 'secondary' : 'outline'}
                    size="sm"
                    className="mt-4 w-full"
                    disabled={true}
                  >
                    {isCurrent ? 'Current Plan' : 'Upgrade — Unavailable'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            Payment processing is not configured in this workspace. Plan upgrades and paid-plan activation are unavailable.
            Usage limits are enforced server-side based on your organization's current plan.
          </span>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Prices are proposed product pricing, not validated market research. No payment methods are stored or charged.
        </p>
      </div>
    </div>
  );
}
