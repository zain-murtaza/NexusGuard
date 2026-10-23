'use client';

import { CreditCard, Check, Zap, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { useAppData } from '@/hooks/use-app-data';
import { LoadingState, ErrorState } from '@/components/state';

const plans = [
  {
    name: 'Free',
    price: '$0',
    icon: CreditCard,
    features: ['1 framework', 'Up to 25 evidence items', 'Manual evidence upload', 'Basic findings'],
    current: false,
  },
  {
    name: 'Starter',
    price: '$29/mo',
    icon: Zap,
    features: ['3 frameworks', 'Up to 250 evidence items', 'Automated collection', 'AI gap analysis (monthly)'],
    current: false,
  },
  {
    name: 'Professional',
    price: '$99/mo',
    icon: Building2,
    features: ['Unlimited frameworks', 'Up to 2,500 evidence items', 'All integrations', 'AI gap analysis (on-demand)', 'Remediation tracking', 'Audit trail export'],
    current: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    icon: Building2,
    features: ['Everything in Professional', 'Unlimited evidence', 'Custom controls', 'SSO & SAML', 'Dedicated support', 'On-premise deployment'],
    current: false,
  },
];

export default function BillingPage() {
  const { subscription, organization, loading, error } = useAppData();

  if (loading) return <div className="p-6"><LoadingState label="Loading billing..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Billing"
        description="Manage your subscription plan and usage"
      />
      {organization?.is_demo && <DemoBanner />}

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Current Plan</h3>
                <Badge className="bg-primary/15 text-primary ring-1 ring-primary/30">
                  {subscription?.plan ?? 'free'}
                </Badge>
                <Badge variant="secondary">{subscription?.status ?? 'inactive'}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {subscription?.seats ?? 0} seats
                {subscription?.current_period_end && ` • Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="text-sm font-medium text-foreground">{organization?.name ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.name}
              className={plan.current ? 'ring-2 ring-primary' : ''}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${plan.current ? 'bg-primary/15' : 'bg-secondary'}`}>
                    <Icon className={`h-4 w-4 ${plan.current ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <CardTitle className="text-sm">{plan.name}</CardTitle>
                </div>
                <p className="text-2xl font-bold text-foreground">{plan.price}</p>
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
                  variant={plan.current ? 'secondary' : 'outline'}
                  size="sm"
                  className="mt-4 w-full"
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Billing integration is not active in this demonstration workspace. No payment methods are stored or charged.
      </p>
    </div>
  );
}
