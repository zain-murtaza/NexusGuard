'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Clock,
  Activity,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { LoadingState, ErrorState } from '@/components/state';
import { StatusBadge } from '@/components/status-badge';
import { useAppData } from '@/hooks/use-app-data';
import type { DashboardSummary } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

export default function OverviewPage() {
  const { organization: authOrg, user } = useAuth();
  const { organization, summary, findings, tasks, auditEvents, loading, error } = useAppData();
  const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    if (!authOrg) return;
    async function fetchTrend() {
      const { supabase } = await import('@/lib/supabase-client');
      const { data } = await supabase
        .from('audit_events')
        .select('created_at')
        .eq('organization_id', authOrg!.id)
        .order('created_at', { ascending: true })
        .limit(30);
      if (data) {
        const grouped: Record<string, number> = {};
        data.forEach((e: { created_at: string }) => {
          const d = e.created_at.split('T')[0];
          grouped[d] = (grouped[d] ?? 0) + 1;
        });
        setTrendData(Object.entries(grouped).map(([date, count]) => ({ date, count })));
      }
    }
    fetchTrend();
  }, [authOrg]);

  if (loading) return <div className="p-6"><LoadingState label="Loading dashboard..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  const s: DashboardSummary = summary ?? {
    totalControls: 0, totalEvidence: 0, verifiedEvidence: 0,
    totalFindings: 0, openFindings: 0, criticalFindings: 0,
    totalTasks: 0, openTasks: 0, inProgressTasks: 0, completedTasks: 0,
    coveragePercentage: 0,
  };

  const maxTrend = Math.max(...trendData.map((d) => d.count), 1);

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Overview"
        description={`Security posture for ${organization?.name ?? 'your workspace'}`}
      />
      {organization?.is_demo && <DemoBanner />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={ShieldCheck}
          label="Control Coverage"
          value={`${s.coveragePercentage}%`}
          sub={`${s.totalControls} total controls`}
        />
        <SummaryCard
          icon={FileCheck2}
          label="Evidence Items"
          value={s.totalEvidence.toString()}
          sub={`${s.verifiedEvidence} verified`}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Open Findings"
          value={s.openFindings.toString()}
          sub={`${s.criticalFindings} critical`}
          accent={s.openFindings > 0 ? 'warning' : 'default'}
        />
        <SummaryCard
          icon={Wrench}
          label="Active Tasks"
          value={(s.openTasks + s.inProgressTasks).toString()}
          sub={`${s.inProgressTasks} in progress`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <div className="flex items-end gap-1.5 h-40">
                {trendData.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 rounded-t bg-primary/20 hover:bg-primary/40 transition-colors group relative"
                    style={{ height: `${(d.count / maxTrend) * 100}%` }}
                    title={`${d.date}: ${d.count} events`}
                  >
                    <div className="absolute inset-x-0 -top-6 hidden group-hover:block rounded bg-popover px-2 py-1 text-[10px] text-foreground shadow-lg z-10">
                      {d.count} events
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No activity recorded yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coverage gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(s.coveragePercentage / 100) * 327} 327`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{s.coveragePercentage}%</span>
                <span className="text-[10px] text-muted-foreground">Controls covered</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground text-center">
              {s.totalEvidence} evidence items covering {s.totalControls} controls
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent findings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Findings</CardTitle>
            <Link href="/findings" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {findings.slice(0, 4).map((f) => (
              <Link
                key={f.id}
                href="/findings"
                className="block rounded-md border border-border p-3 transition-colors hover:bg-secondary"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{f.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {f.control?.reference ?? 'Unlinked'} • {new Date(f.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge severity={f.severity} />
                </div>
              </Link>
            ))}
            {findings.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No findings yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Active Remediation</CardTitle>
            <Link href="/remediation" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href="/remediation"
                className="block rounded-md border border-border p-3 transition-colors hover:bg-secondary"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString()}` : 'No deadline'}
                      {t.assignee ? ` • ${t.assignee}` : ''}
                    </p>
                  </div>
                  <StatusBadge taskStatus={t.status} />
                </div>
              </Link>
            ))}
            {tasks.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No remediation tasks yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent audit events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Audit Trail</CardTitle>
          <Link href="/audit-trail" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditEvents.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                <span className="font-medium text-foreground">{e.action.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">by {e.actor}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
            ))}
            {auditEvents.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No audit events yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent?: 'default' | 'warning';
}) {
  return (
    <Card className={accent === 'warning' ? 'ring-1 ring-orange-500/20' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent === 'warning' ? 'bg-orange-500/10' : 'bg-primary/10'}`}>
            <Icon className={`h-4 w-4 ${accent === 'warning' ? 'text-orange-400' : 'text-primary'}`} />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
