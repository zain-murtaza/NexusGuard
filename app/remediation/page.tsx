'use client';

import { useState, useMemo, Fragment } from 'react';
import { Wrench, Search, Filter, User, Calendar, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { LoadingState, ErrorState, EmptyState } from '@/components/state';
import { StatusBadge } from '@/components/status-badge';
import { useAppData } from '@/hooks/use-app-data';
import { useAuth } from '@/hooks/use-auth';
import { updateTaskStatus } from '@/lib/queries';
import type { TaskStatus } from '@/lib/types';

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityColors: Record<string, string> = {
  urgent: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-amber-400',
  low: 'text-sky-400',
};

const statusTransitions: Record<string, { value: string; label: string }[]> = {
  open: [
    { value: 'in_progress', label: 'Start Work' },
    { value: 'completed', label: 'Mark Complete' },
    { value: 'cancelled', label: 'Cancel' },
  ],
  in_progress: [
    { value: 'completed', label: 'Mark Complete' },
    { value: 'open', label: 'Move to Open' },
    { value: 'cancelled', label: 'Cancel' },
  ],
  completed: [
    { value: 'in_progress', label: 'Reopen' },
  ],
  cancelled: [
    { value: 'open', label: 'Reopen' },
  ],
};

export default function RemediationPage() {
  const { tasks, loading, error, refresh } = useAppData();
  const { user, organization } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.assignee ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  if (loading) return <div className="p-6"><LoadingState label="Loading tasks..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  async function handleStatusChange(taskId: string, newStatus: string) {
    if (!organization || !user) return;
    setUpdatingId(taskId);
    setActionError(null);
    try {
      await updateTaskStatus(organization.id, user.email, taskId, newStatus);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setUpdatingId(null);
    }
  }

  const overdue = tasks.filter(
    (t) => t.due_date && t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.due_date) < new Date()
  ).length;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Remediation"
        description="Track and manage remediation tasks for identified findings"
      />
      {organization?.is_demo && <DemoBanner />}

      {actionError && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Tasks</p><p className="text-xl font-bold text-foreground">{tasks.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-xl font-bold text-amber-400">{tasks.filter((t) => t.status === 'in_progress').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold text-primary">{tasks.filter((t) => t.status === 'completed').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-xl font-bold text-red-400">{overdue}</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[30%]">Task</TableHead>
                  <TableHead>Linked Finding</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const isOverdue =
                    t.due_date && t.status !== 'completed' && t.status !== 'cancelled' &&
                    new Date(t.due_date) < new Date();
                  const isExpanded = expandedId === t.id;
                  const transitions = statusTransitions[t.status] ?? [];
                  return (
                    <Fragment key={t.id}>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : t.id)}
                              className="mt-0.5 text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                              {t.description && (
                                <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {t.finding ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs text-foreground">{t.finding.title}</span>
                              <StatusBadge severity={t.finding.severity} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {t.assignee ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" /> {t.assignee}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium capitalize ${priorityColors[t.priority] ?? ''}`}>
                            {t.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          {t.due_date ? (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                              <Calendar className="h-3 w-3" />
                              {new Date(t.due_date).toLocaleDateString()}
                              {isOverdue && <span className="font-medium"> (overdue)</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge taskStatus={t.status as TaskStatus} />
                        </TableCell>
                        <TableCell>
                          {updatingId === t.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : transitions.length > 0 ? (
                            <Select onValueChange={(v) => handleStatusChange(t.id, v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Change..." />
                              </SelectTrigger>
                              <SelectContent>
                                {transitions.map((tr) => (
                                  <SelectItem key={tr.value} value={tr.value}>{tr.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-secondary/30">
                            <div className="space-y-2 py-2">
                              {t.description && (
                                <p className="text-sm text-muted-foreground">{t.description}</p>
                              )}
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                                {t.completed_at && <span>Completed: {new Date(t.completed_at).toLocaleDateString()}</span>}
                                {t.due_date && <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Wrench}
              title="No remediation tasks"
              description={search || statusFilter !== 'all' ? "Try adjusting your filters." : "Create tasks from findings to track remediation."}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
