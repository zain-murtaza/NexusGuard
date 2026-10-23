'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, Search, Filter, ChevronDown, ChevronRight, Loader2, Plus, CheckCircle2, XCircle, Play, Shield, Sparkles, FileSearch, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { LoadingState, ErrorState, EmptyState } from '@/components/state';
import { StatusBadge } from '@/components/status-badge';
import { useAppData } from '@/hooks/use-app-data';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';
import { runGapAnalysis, ENGINE_VERSION, RULE_VERSION } from '@/lib/gap-analysis';
import { createRemediationTask, acknowledgeFinding, verifyFinding } from '@/lib/queries';
import type { Severity, FindingStatus, AIReviewContent } from '@/lib/types';

const severityOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'false_positive', label: 'False Positive' },
];

const priorityOptions = ['low', 'medium', 'high', 'urgent'];

export default function FindingsPage() {
  const { findings, controls, evidence, aiRuns, loading, error, refresh } = useAppData();
  const { user, organization } = useAuth();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [remediationDialogFor, setRemediationDialogFor] = useState<string | null>(null);
  const [verifyDialogFor, setVerifyDialogFor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignee: '', priority: 'medium', due_date: '' });
  const [verifyForm, setVerifyForm] = useState({ result: 'approved' as 'approved' | 'rejected', notes: '' });
  const [aiReviews, setAiReviews] = useState<Record<string, AIReviewContent[]>>({});
  const [aiReviewLoading, setAiReviewLoading] = useState<string | null>(null);
  const [aiReviewError, setAiReviewError] = useState<Record<string, string>>({});
  const [aiReviewNotConfigured, setAiReviewNotConfigured] = useState(false);

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      const matchesSearch =
        f.title.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [findings, search, severityFilter, statusFilter]);

  if (loading) return <div className="p-6"><LoadingState label="Loading findings..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  async function handleRunAnalysis() {
    if (!organization || !user) return;
    setRunningAnalysis(true);
    setActionError(null);
    try {
      const result = runGapAnalysis(controls, evidence);

      const { data: runData, error: runError } = await supabase
        .from('ai_analysis_runs')
        .insert({
          organization_id: organization.id,
          run_type: 'gap_analysis',
          status: 'completed',
          input_summary: `${result.controlsAnalyzed} controls analyzed against ${evidence.length} evidence items`,
          result_summary: `${result.findings.length} potential gaps identified`,
          findings_count: result.findings.length,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          engine_version: ENGINE_VERSION,
          rule_version: RULE_VERSION,
          controls_analyzed: result.controlsAnalyzed,
          controls_covered: result.controlsCovered,
          controls_gapped: result.controlsGapped,
        })
        .select('*')
        .single();

      if (runError) throw runError;

      if (result.findings.length > 0) {
        const findingsToInsert = result.findings.map((f) => ({
          organization_id: organization.id,
          control_id: f.control_id,
          evidence_id: null,
          title: f.title,
          description: f.description,
          severity: f.severity,
          status: 'open',
          reasoning: f.reasoning,
          analysis_run_id: runData.id,
        }));
        const { error: findingsError } = await supabase.from('findings').insert(findingsToInsert);
        if (findingsError) throw findingsError;
      }

      await supabase.from('audit_events').insert({
        organization_id: organization.id,
        actor: user.email,
        action: 'analysis.run',
        entity_type: 'ai_analysis_run',
        entity_id: runData.id,
        metadata: { findings_count: result.findings.length, engine: ENGINE_VERSION, rule_version: RULE_VERSION },
      });

      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to run analysis.');
    } finally {
      setRunningAnalysis(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!organization || !user || !remediationDialogFor) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await createRemediationTask(organization.id, user.email, {
        finding_id: remediationDialogFor,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        assignee: taskForm.assignee.trim() || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
      });
      setRemediationDialogFor(null);
      setTaskForm({ title: '', description: '', assignee: '', priority: 'medium', due_date: '' });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAIReview(findingId: string) {
    if (!organization || !user) return;
    setAiReviewLoading(findingId);
    setAiReviewError((prev) => { const next = { ...prev }; delete next[findingId]; return next; });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session.');

      const res = await fetch('/api/ai-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ findingId }),
      });

      const data = await res.json();

      if (res.status === 503 && data.code === 'not_configured') {
        setAiReviewNotConfigured(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'AI review failed.');
      }

      const review = data.review as AIReviewContent;
      setAiReviews((prev) => ({
        ...prev,
        [findingId]: [review, ...(prev[findingId] ?? [])],
      }));
      refresh();
    } catch (err) {
      setAiReviewError((prev) => ({
        ...prev,
        [findingId]: err instanceof Error ? err.message : 'AI review failed.',
      }));
    } finally {
      setAiReviewLoading(null);
    }
  }

  async function handleAcknowledge(findingId: string) {
    if (!organization || !user) return;
    try {
      await acknowledgeFinding(organization.id, user.email, findingId);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to acknowledge finding.');
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!organization || !user || !verifyDialogFor) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await verifyFinding(
        organization.id,
        user.email,
        user.id,
        verifyDialogFor,
        verifyForm.result,
        verifyForm.notes.trim() || null
      );
      setVerifyDialogFor(null);
      setVerifyForm({ result: 'approved', notes: '' });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to verify finding.');
    } finally {
      setSubmitting(false);
    }
  }

  const severityCounts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };

  const latestRun = aiRuns[0];

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Findings"
        description="Security findings identified through evidence analysis"
        action={
          <Button size="sm" onClick={handleRunAnalysis} disabled={runningAnalysis}>
            {runningAnalysis ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            Run Gap Analysis
          </Button>
        }
      />
      {organization?.is_demo && <DemoBanner />}

      {actionError && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">
          {actionError}
        </div>
      )}

      {latestRun && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Last analysis: <span className="text-foreground font-medium">{latestRun.result_summary ?? 'N/A'}</span>
              {' — '}
              <span className="text-xs">{latestRun.controls_analyzed} controls analyzed, {latestRun.controls_covered} covered, {latestRun.controls_gapped} gapped</span>
              {' '}
              <span className="text-xs text-muted-foreground">({latestRun.engine_version} / {latestRun.rule_version})</span>
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => (
          <Card key={sev}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground capitalize">{sev}</p>
                <p className="text-xl font-bold text-foreground">{severityCounts[sev]}</p>
              </div>
              <StatusBadge severity={sev} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search findings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {severityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((f) => {
            const isExpanded = expandedId === f.id;
            return (
              <Card key={f.id}>
                <button
                  className="flex w-full items-start justify-between gap-4 p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : f.id)}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400" />
                        <p className="truncate text-sm font-medium text-foreground">{f.title}</p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {f.control?.reference ?? 'Unlinked control'}
                        {f.evidence && ` • Evidence: ${f.evidence.title}`}
                        {` • ${new Date(f.created_at).toLocaleDateString()}`}
                        {f.verified_at && ` • Verified ${new Date(f.verified_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <StatusBadge severity={f.severity} />
                    <StatusBadge findingStatus={f.status as FindingStatus} />
                  </div>
                </button>
                {isExpanded && (
                  <CardContent className="border-t border-border pt-4 space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{f.description}</p>
                    </div>
                    {f.reasoning && (
                      <div className="rounded-md bg-secondary p-3">
                        <p className="text-xs font-medium text-foreground">Analysis Reasoning</p>
                        <p className="mt-1 text-xs text-muted-foreground">{f.reasoning}</p>
                      </div>
                    )}

                    {f.status === 'open' && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAcknowledge(f.id)}>
                          Acknowledge
                        </Button>
                        <Dialog open={remediationDialogFor === f.id} onOpenChange={(open) => setRemediationDialogFor(open ? f.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Remediation Task
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Create Remediation Task</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateTask} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="task-title">Task Title</Label>
                                <Input
                                  id="task-title"
                                  placeholder="e.g., Implement quarterly access review"
                                  value={taskForm.title}
                                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="task-desc">Description</Label>
                                <Textarea
                                  id="task-desc"
                                  placeholder="What needs to be done..."
                                  value={taskForm.description}
                                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                  rows={3}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="task-assignee">Assignee</Label>
                                  <Input
                                    id="task-assignee"
                                    placeholder="e.g., Jane Smith"
                                    value={taskForm.assignee}
                                    onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Priority</Label>
                                  <Select
                                    value={taskForm.priority}
                                    onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}
                                  >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {priorityOptions.map((p) => (
                                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="task-due">Due Date</Label>
                                <Input
                                  id="task-due"
                                  type="date"
                                  value={taskForm.due_date}
                                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                />
                              </div>
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setRemediationDialogFor(null)}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Task'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    {f.status === 'acknowledged' && (
                      <div className="flex flex-wrap gap-2">
                        <Dialog open={verifyDialogFor === f.id} onOpenChange={(open) => setVerifyDialogFor(open ? f.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-primary" /> Verify Resolution
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Verify Finding Resolution</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleVerify} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Verification Result</Label>
                                <Select
                                  value={verifyForm.result}
                                  onValueChange={(v) => setVerifyForm({ ...verifyForm, result: v as 'approved' | 'rejected' })}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="approved">Approved (mark as resolved)</SelectItem>
                                    <SelectItem value="rejected">Rejected (reopen finding)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="verify-notes">Notes</Label>
                                <Textarea
                                  id="verify-notes"
                                  placeholder="Verification details..."
                                  value={verifyForm.notes}
                                  onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
                                  rows={3}
                                />
                              </div>
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setVerifyDialogFor(null)}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Verification'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    {/* AI Review section */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAIReview(f.id)}
                          disabled={aiReviewLoading === f.id || aiReviewNotConfigured}
                        >
                          {aiReviewLoading === f.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          AI Review
                        </Button>
                        {aiReviewNotConfigured && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            AI review is not configured. Contact your administrator.
                          </span>
                        )}
                      </div>

                      {aiReviewError[f.id] && (
                        <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">
                          {aiReviewError[f.id]}
                        </div>
                      )}

                      {(aiReviews[f.id] ?? []).length > 0 && (
                        <div className="space-y-3">
                          {aiReviews[f.id]!.map((review, idx) => (
                            <div key={idx} className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
                              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                                <FileSearch className="h-3.5 w-3.5" />
                                AI Review {idx === 0 ? '(latest)' : `#${aiReviews[f.id]!.length - idx}`}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-foreground">Review Summary</p>
                                <p className="mt-1 text-sm text-muted-foreground">{review.review_summary}</p>
                              </div>
                              {review.evidence_examined.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-foreground">Evidence Examined</p>
                                  <ul className="mt-1 space-y-0.5">
                                    {review.evidence_examined.map((e, i) => (
                                      <li key={i} className="text-xs text-muted-foreground">- {e}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-medium text-foreground">Evidence Gaps & Uncertainties</p>
                                <p className="mt-1 text-sm text-muted-foreground">{review.evidence_gaps_and_uncertainties}</p>
                              </div>
                              {review.recommended_next_actions.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-foreground">Recommended Next Actions</p>
                                  <ul className="mt-1 space-y-0.5">
                                    {review.recommended_next_actions.map((a, i) => (
                                      <li key={i} className="text-xs text-muted-foreground">- {a}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-medium text-foreground">Limitations</p>
                                <p className="mt-1 text-sm text-muted-foreground">{review.limitations}</p>
                              </div>
                              <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
                                Advisory only. Does not replace a human security or compliance review.
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {f.status === 'resolved' && f.verified_at && (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified on {new Date(f.verified_at).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="No findings found"
          description={search || severityFilter !== 'all' || statusFilter !== 'all' ? "Try adjusting your filters." : "Run a gap analysis to identify findings."}
        />
      )}
    </div>
  );
}
