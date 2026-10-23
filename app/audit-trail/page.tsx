'use client';

import { History, User, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { LoadingState, ErrorState, EmptyState } from '@/components/state';
import { useAppData } from '@/hooks/use-app-data';

const actionLabels: Record<string, string> = {
  organization_created: 'Organization Created',
  evidence_uploaded: 'Evidence Uploaded',
  evidence_verified: 'Evidence Verified',
  finding_created: 'Finding Created',
  finding_acknowledged: 'Finding Acknowledged',
  task_status_changed: 'Task Status Changed',
  ai_analysis_completed: 'AI Analysis Completed',
};

export default function AuditTrailPage() {
  const { auditEvents, organization, loading, error } = useAppData();

  if (loading) return <div className="p-6"><LoadingState label="Loading audit trail..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Audit Trail"
        description="Append-only record of all significant actions in this workspace"
      />
      {organization?.is_demo && <DemoBanner />}

      {auditEvents.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="relative">
              {auditEvents.map((e, idx) => (
                <div key={e.id} className="flex gap-4 px-5 py-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    {idx < auditEvents.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {actionLabels[e.action] ?? e.action.replace(/_/g, ' ')}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {e.actor}
                          </span>
                          {e.entity_type && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 capitalize">
                              {e.entity_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </div>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <div className="mt-2 rounded-md bg-secondary/50 p-2">
                        <pre className="text-[10px] text-muted-foreground overflow-x-auto">
                          {JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={History}
          title="No audit events"
          description="Actions taken in this workspace will be recorded here."
        />
      )}
    </div>
  );
}
