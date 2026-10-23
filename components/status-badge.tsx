'use client';

import { cn } from '@/lib/utils';
import type { Severity, EvidenceStatus, TaskStatus, FindingStatus } from '@/lib/types';

const severityConfig: Record<Severity, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
  },
  high: {
    label: 'High',
    className: 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  },
  low: {
    label: 'Low',
    className: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  },
};

const evidenceStatusConfig: Record<EvidenceStatus, { label: string; className: string }> = {
  verified: {
    label: 'Verified',
    className: 'bg-primary/15 text-primary ring-1 ring-primary/30',
  },
  collected: {
    label: 'Collected',
    className: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
  },
};

const taskStatusConfig: Record<TaskStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-primary/15 text-primary ring-1 ring-primary/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground ring-1 ring-border',
  },
};

const findingStatusConfig: Record<FindingStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
  },
  acknowledged: {
    label: 'Acknowledged',
    className: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-primary/15 text-primary ring-1 ring-primary/30',
  },
  false_positive: {
    label: 'False Positive',
    className: 'bg-muted text-muted-foreground ring-1 ring-border',
  },
};

interface StatusBadgeProps {
  severity?: Severity;
  evidenceStatus?: EvidenceStatus;
  taskStatus?: TaskStatus;
  findingStatus?: FindingStatus;
}

export function StatusBadge({ severity, evidenceStatus, taskStatus, findingStatus }: StatusBadgeProps) {
  let config: { label: string; className: string } | null = null;
  if (severity) config = severityConfig[severity];
  else if (evidenceStatus) config = evidenceStatusConfig[evidenceStatus];
  else if (taskStatus) config = taskStatusConfig[taskStatus];
  else if (findingStatus) config = findingStatusConfig[findingStatus];

  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <StatusBadge severity={severity} />;
}
