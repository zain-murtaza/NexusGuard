export type PlanName = 'starter' | 'pro' | 'team';

export interface PlanConfig {
  name: PlanName;
  displayName: string;
  price: number;
  priceLabel: string;
  description: string;
  limits: {
    aiReviewsPerMonth: number;
    githubInspectionsPerMonth: number;
  };
  features: string[];
}

export const PLANS: Record<PlanName, PlanConfig> = {
  starter: {
    name: 'starter',
    displayName: 'Starter',
    price: 0,
    priceLabel: '$0/mo',
    description: 'Core evidence management, deterministic gap analysis, and a monthly allowance for AI reviews and GitHub inspections.',
    limits: {
      aiReviewsPerMonth: 10,
      githubInspectionsPerMonth: 10,
    },
    features: [
      'Core evidence management',
      'Deterministic gap analysis',
      '10 AI reviews per month',
      '10 GitHub inspections per month',
      '1 organization seat',
    ],
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 29,
    priceLabel: '$29/mo',
    description: 'Higher AI-review and GitHub-inspection limits for small SaaS teams.',
    limits: {
      aiReviewsPerMonth: 100,
      githubInspectionsPerMonth: 100,
    },
    features: [
      'Everything in Starter',
      '100 AI reviews per month',
      '100 GitHub inspections per month',
      '5 organization seats',
      'Remediation tracking',
      'Audit trail',
    ],
  },
  team: {
    name: 'team',
    displayName: 'Team',
    price: 99,
    priceLabel: '$99/mo',
    description: 'Higher allowances for teams managing multiple control frameworks and larger evidence volumes.',
    limits: {
      aiReviewsPerMonth: 500,
      githubInspectionsPerMonth: 500,
    },
    features: [
      'Everything in Pro',
      '500 AI reviews per month',
      '500 GitHub inspections per month',
      '20 organization seats',
      'Priority support',
    ],
  },
};

export const PLAN_LIST: PlanConfig[] = [PLANS.starter, PLANS.pro, PLANS.team];

export function getPlanConfig(planName: string): PlanConfig {
  const normalized = planName.toLowerCase().trim();
  if (normalized in PLANS) return PLANS[normalized as PlanName];
  if (normalized === 'professional') return PLANS.pro;
  if (normalized === 'free') return PLANS.starter;
  if (normalized === 'enterprise') return PLANS.team;
  return PLANS.starter;
}

export function isPaidPlan(planName: string): boolean {
  const config = getPlanConfig(planName);
  return config.price > 0;
}
