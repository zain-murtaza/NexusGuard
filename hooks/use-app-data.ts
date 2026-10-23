'use client';

import { useEffect, useState } from 'react';
import type {
  Organization,
  Subscription,
  Framework,
  ControlWithFramework,
  EvidenceWithControl,
  FindingWithRelations,
  RemediationTaskWithFinding,
  AIAnalysisRun,
  AuditEvent,
  DashboardSummary,
} from '@/lib/types';
import {
  fetchOrganization,
  fetchSubscription,
  fetchFrameworks,
  fetchControls,
  fetchEvidence,
  fetchFindings,
  fetchRemediationTasks,
  fetchAIAnalysisRuns,
  fetchAuditEvents,
  fetchDashboardSummary,
} from '@/lib/queries';
import { useAuth } from '@/hooks/use-auth';

interface AppData {
  organization: Organization | null;
  subscription: Subscription | null;
  frameworks: Framework[];
  controls: ControlWithFramework[];
  evidence: EvidenceWithControl[];
  findings: FindingWithRelations[];
  tasks: RemediationTaskWithFinding[];
  aiRuns: AIAnalysisRun[];
  auditEvents: AuditEvent[];
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAppData(): AppData {
  const { organization, user } = useAuth();
  const orgId = organization?.id ?? null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<AppData>({
    organization: null,
    subscription: null,
    frameworks: [],
    controls: [],
    evidence: [],
    findings: [],
    tasks: [],
    aiRuns: [],
    auditEvents: [],
    summary: null,
    loading: true,
    error: null,
    refresh: () => setRefreshKey((k) => k + 1),
  });

  useEffect(() => {
    if (!orgId) {
      setData((prev) => ({ ...prev, loading: false, error: null }));
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));
        const [
          org,
          subscription,
          frameworks,
          controls,
          evidence,
          findings,
          tasks,
          aiRuns,
          auditEvents,
          summary,
        ] = await Promise.all([
          fetchOrganization(orgId!),
          fetchSubscription(orgId!),
          fetchFrameworks(),
          fetchControls(),
          fetchEvidence(orgId!),
          fetchFindings(orgId!),
          fetchRemediationTasks(orgId!),
          fetchAIAnalysisRuns(orgId!),
          fetchAuditEvents(orgId!),
          fetchDashboardSummary(orgId!),
        ]);
        if (!cancelled) {
          setData({
            organization: org,
            subscription,
            frameworks,
            controls,
            evidence,
            findings,
            tasks,
            aiRuns,
            auditEvents,
            summary,
            loading: false,
            error: null,
            refresh: () => setRefreshKey((k) => k + 1),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load data',
            refresh: () => setRefreshKey((k) => k + 1),
          }));
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orgId, user?.id, refreshKey]);

  return data;
}
