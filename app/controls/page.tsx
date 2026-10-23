'use client';

import { useState, useMemo } from 'react';
import { ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { LoadingState, ErrorState, EmptyState } from '@/components/state';
import { useAppData } from '@/hooks/use-app-data';
import { cn } from '@/lib/utils';

export default function ControlsPage() {
  const { controls, evidence, frameworks, organization, loading, error } = useAppData();
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);

  const controlsByFramework = useMemo(() => {
    const map: Record<string, typeof controls> = {};
    controls.forEach((c) => {
      const fid = c.framework_id;
      if (!map[fid]) map[fid] = [];
      map[fid].push(c);
    });
    return map;
  }, [controls]);

  const evidenceByControl = useMemo(() => {
    const map: Record<string, number> = {};
    evidence.forEach((e) => {
      if (e.control_id) {
        map[e.control_id] = (map[e.control_id] ?? 0) + 1;
      }
    });
    return map;
  }, [evidence]);

  if (loading) return <div className="p-6"><LoadingState label="Loading controls..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Controls"
        description="Compliance framework controls and their evidence coverage"
      />
      {organization?.is_demo && <DemoBanner />}

      {frameworks.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No frameworks loaded"
          description="Compliance frameworks will appear here once configured."
        />
      ) : (
        <div className="space-y-4">
          {frameworks.map((fw) => {
            const fwControls = controlsByFramework[fw.id] ?? [];
            const covered = fwControls.filter((c) => (evidenceByControl[c.id] ?? 0) > 0).length;
            const coverage = fwControls.length > 0 ? Math.round((covered / fwControls.length) * 100) : 0;
            const isExpanded = expandedFramework === fw.id;

            return (
              <Card key={fw.id}>
                <button
                  className="flex w-full items-center justify-between p-5 text-left"
                  onClick={() => setExpandedFramework(isExpanded ? null : fw.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{fw.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fwControls.length} controls • {covered} with evidence
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${coverage}%` }}
                      />
                    </div>
                    <Badge variant="secondary" className="tabular-nums">{coverage}%</Badge>
                  </div>
                </button>

                {isExpanded && (
                  <CardContent className="border-t border-border p-0">
                    <div className="divide-y divide-border">
                      {fwControls.map((c) => {
                        const evCount = evidenceByControl[c.id] ?? 0;
                        return (
                          <div key={c.id} className="flex items-start justify-between gap-4 p-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
                                  {c.reference}
                                </span>
                                <span className="text-sm font-medium text-foreground">{c.title}</span>
                              </div>
                              {c.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                              )}
                              {c.category && (
                                <span className="mt-1 inline-block text-[10px] text-muted-foreground">{c.category}</span>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
                                  evCount > 0
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-orange-500/15 text-orange-400'
                                )}
                              >
                                {evCount > 0 ? `${evCount} evidence` : 'No evidence'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
