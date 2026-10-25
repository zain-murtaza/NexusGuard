import { getPlanConfig, PLANS, PLAN_LIST, isPaidPlan } from '../plans';
import { getCurrentMonthPeriod } from '../usage';

describe('plans configuration', () => {
  it('defines three plans: starter, pro, team', () => {
    expect(Object.keys(PLANS).sort()).toEqual(['pro', 'starter', 'team']);
    expect(PLAN_LIST).toHaveLength(3);
  });

  it('starter is $0/mo', () => {
    expect(PLANS.starter.price).toBe(0);
    expect(PLANS.starter.priceLabel).toBe('$0/mo');
  });

  it('pro is $29/mo', () => {
    expect(PLANS.pro.price).toBe(29);
    expect(PLANS.pro.priceLabel).toBe('$29/mo');
  });

  it('team is $99/mo', () => {
    expect(PLANS.team.price).toBe(99);
    expect(PLANS.team.priceLabel).toBe('$99/mo');
  });

  it('starter has lower limits than pro', () => {
    expect(PLANS.starter.limits.aiReviewsPerMonth).toBeLessThan(PLANS.pro.limits.aiReviewsPerMonth);
    expect(PLANS.starter.limits.githubInspectionsPerMonth).toBeLessThan(PLANS.pro.limits.githubInspectionsPerMonth);
  });

  it('pro has lower limits than team', () => {
    expect(PLANS.pro.limits.aiReviewsPerMonth).toBeLessThan(PLANS.team.limits.aiReviewsPerMonth);
    expect(PLANS.pro.limits.githubInspectionsPerMonth).toBeLessThan(PLANS.team.limits.githubInspectionsPerMonth);
  });

  it('all plans have positive limits', () => {
    for (const plan of PLAN_LIST) {
      expect(plan.limits.aiReviewsPerMonth).toBeGreaterThan(0);
      expect(plan.limits.githubInspectionsPerMonth).toBeGreaterThan(0);
    }
  });
});

describe('getPlanConfig', () => {
  it('returns starter for "starter"', () => {
    expect(getPlanConfig('starter').name).toBe('starter');
  });

  it('returns pro for "pro"', () => {
    expect(getPlanConfig('pro').name).toBe('pro');
  });

  it('returns team for "team"', () => {
    expect(getPlanConfig('team').name).toBe('team');
  });

  it('maps legacy "professional" to pro', () => {
    expect(getPlanConfig('professional').name).toBe('pro');
  });

  it('maps legacy "free" to starter', () => {
    expect(getPlanConfig('free').name).toBe('starter');
  });

  it('maps legacy "enterprise" to team', () => {
    expect(getPlanConfig('enterprise').name).toBe('team');
  });

  it('falls back to starter for unknown plans', () => {
    expect(getPlanConfig('unknown').name).toBe('starter');
    expect(getPlanConfig('').name).toBe('starter');
    expect(getPlanConfig('GOLD').name).toBe('starter');
  });

  it('is case-insensitive', () => {
    expect(getPlanConfig('STARTER').name).toBe('starter');
    expect(getPlanConfig('Pro').name).toBe('pro');
    expect(getPlanConfig('TEAM').name).toBe('team');
  });
});

describe('isPaidPlan', () => {
  it('returns false for starter', () => {
    expect(isPaidPlan('starter')).toBe(false);
  });

  it('returns true for pro', () => {
    expect(isPaidPlan('pro')).toBe(true);
  });

  it('returns true for team', () => {
    expect(isPaidPlan('team')).toBe(true);
  });
});

describe('getCurrentMonthPeriod', () => {
  it('returns the first day of the current month as start', () => {
    const period = getCurrentMonthPeriod(new Date('2026-10-25T12:00:00Z'));
    expect(period.start.getDate()).toBe(1);
    expect(period.start.getMonth()).toBe(9); // October is month index 9
    expect(period.start.getFullYear()).toBe(2026);
  });

  it('returns the last day of the current month as end', () => {
    const period = getCurrentMonthPeriod(new Date('2026-10-25T12:00:00Z'));
    expect(period.end.getMonth()).toBe(9);
    expect(period.end.getFullYear()).toBe(2026);
    expect(period.end.getDate()).toBe(31);
  });

  it('handles December correctly (wraps to next year)', () => {
    const period = getCurrentMonthPeriod(new Date('2026-12-15T12:00:00Z'));
    expect(period.start.getMonth()).toBe(11);
    expect(period.end.getMonth()).toBe(11);
    expect(period.end.getFullYear()).toBe(2026);
  });

  it('handles January correctly', () => {
    const period = getCurrentMonthPeriod(new Date('2026-01-15T12:00:00Z'));
    expect(period.start.getMonth()).toBe(0);
    expect(period.end.getMonth()).toBe(0);
    expect(period.end.getDate()).toBe(31);
  });

  it('produces a human-readable label', () => {
    const period = getCurrentMonthPeriod(new Date('2026-10-25T12:00:00Z'));
    expect(period.label).toContain('October');
    expect(period.label).toContain('2026');
  });
});
