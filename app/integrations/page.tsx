'use client';

import { useState } from 'react';
import { Plug, CheckCircle2, CircleDashed, ArrowRight, Github, Loader2, Search, AlertCircle, FileCheck2, ChevronRight, ChevronDown, ExternalLink, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { useAuth } from '@/hooks/use-auth';
import { useAppData } from '@/hooks/use-app-data';
import { supabase } from '@/lib/supabase-client';
import type { GitHubInspectionResult, GitHubSignal, ControlWithFramework } from '@/lib/types';

const otherIntegrations = [
  { name: 'Okta', category: 'Identity Provider', description: 'Sync SSO configuration and user access evidence.' },
  { name: 'Splunk', category: 'SIEM', description: 'Export security alerts and incident response metrics.' },
  { name: 'AWS', category: 'Cloud Infrastructure', description: 'Gather cloud security posture and configuration evidence.' },
  { name: 'Datadog', category: 'Monitoring', description: 'Pull infrastructure monitoring and alert configuration.' },
  { name: '1Password', category: 'Secrets Management', description: 'Verify password policies and access vault configurations.' },
];

const categoryLabels: Record<string, string> = {
  policy: 'Security Policy',
  'code-review': 'Code Review',
  dependencies: 'Dependency Management',
  'ci-cd': 'CI/CD',
  licensing: 'Licensing',
  documentation: 'Documentation',
};

type Step = 'idle' | 'inspecting' | 'inspected' | 'importing' | 'imported';

export default function IntegrationsPage() {
  const { organization, user } = useAuth();
  const { controls } = useAppData();
  const [repoUrl, setRepoUrl] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<GitHubInspectionResult | null>(null);
  const [selectedSignals, setSelectedSignals] = useState<Set<string>>(new Set());
  const [controlMap, setControlMap] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ message: string; imported: { id: string; title: string }[]; skipped: number } | null>(null);

  async function handleInspect() {
    if (!repoUrl.trim()) return;
    setError(null);
    setStep('inspecting');
    setInspection(null);
    setSelectedSignals(new Set());
    setControlMap({});
    setImportResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session.');
      const res = await fetch('/api/github-inspect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Inspection failed.');
      setInspection(data as GitHubInspectionResult);
      setStep('inspected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inspect repository.');
      setStep('idle');
    }
  }

  function toggleSignal(key: string) {
    setSelectedSignals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleImport() {
    if (!inspection) return;
    const selected = inspection.signals.filter((s) => selectedSignals.has(s.key));
    const missingControl = selected.some((s) => !controlMap[s.key]);
    if (missingControl) {
      setError('Each selected observation must be mapped to a control before importing.');
      return;
    }
    setError(null);
    setStep('importing');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session.');
      const items = selected.map((s) => ({ signal: s, controlId: controlMap[s.key] }));
      const res = await fetch('/api/github-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repoFullName: inspection.repository.fullName,
          repoUrl: inspection.repository.url,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed.');
      setImportResult(data);
      setStep('imported');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import evidence.');
      setStep('inspected');
    }
  }

  function reset() {
    setStep('idle');
    setInspection(null);
    setSelectedSignals(new Set());
    setControlMap({});
    setImportResult(null);
    setError(null);
    setRepoUrl('');
  }

  const selectedCount = selectedSignals.size;
  const allMapped = inspection?.signals.filter((s) => selectedSignals.has(s.key)).every((s) => controlMap[s.key]) ?? false;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Integrations"
        description="Connect external systems to automate evidence collection"
      />
      {organization?.is_demo && <DemoBanner />}

      {/* GitHub Connector Card */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ring-1 ring-border">
              <Github className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm">GitHub Public Repository Connector</CardTitle>
              <p className="text-xs text-muted-foreground">Source Control — Active</p>
            </div>
          </div>
          <Badge className="bg-primary/15 text-primary border-primary/20">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Available
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Inspect a public GitHub repository for security-relevant signals. Detected observations can be imported as evidence pending human review.
            Only publicly accessible repository information is inspected — results are evidence observations, not a certification or complete security audit.
          </p>

          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="repo-url">Public Repository URL</Label>
            <div className="flex gap-2">
              <Input
                id="repo-url"
                placeholder="https://github.com/owner/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={step === 'inspecting' || step === 'importing'}
                onKeyDown={(e) => { if (e.key === 'Enter' && step !== 'inspecting') handleInspect(); }}
              />
              <Button
                size="sm"
                onClick={handleInspect}
                disabled={!repoUrl.trim() || step === 'inspecting' || step === 'importing'}
              >
                {step === 'inspecting' ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-4 w-4" />
                )}
                Inspect
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Inspection Results */}
          {inspection && step !== 'idle' && (
            <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <a href={inspection.repository.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary">
                      {inspection.repository.fullName}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Default branch: {inspection.repository.defaultBranch}
                    {inspection.repository.description && ` — ${inspection.repository.description}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inspected: {new Date(inspection.inspectedAt).toLocaleString()}
                  </p>
                </div>
                {step === 'inspected' && (
                  <Badge variant="secondary" className="text-xs">
                    {inspection.signals.filter((s) => s.detected).length} detected
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {inspection.signals.map((signal) => (
                  <SignalRow
                    key={signal.key}
                    signal={signal}
                    controls={controls}
                    selected={selectedSignals.has(signal.key)}
                    onToggle={() => toggleSignal(signal.key)}
                    controlId={controlMap[signal.key] ?? ''}
                    onControlChange={(cid) => setControlMap((prev) => ({ ...prev, [signal.key]: cid }))}
                    selectable={step === 'inspected'}
                  />
                ))}
              </div>

              {(step === 'inspected' || step === 'importing') && selectedCount > 0 && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} observation(s) selected{allMapped || step === 'importing' ? ' — ready to import' : ' — map all to controls to continue'}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={reset} disabled={step === 'importing'}>Cancel</Button>
                    <Button size="sm" onClick={handleImport} disabled={!allMapped || step === 'importing'}>
                      {step === 'importing' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                      Import {selectedCount} as Evidence
                    </Button>
                  </div>
                </div>
              )}

              {step === 'imported' && importResult && (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{importResult.message}</span>
                  </div>
                  {importResult.imported.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Created evidence records:</p>
                      {importResult.imported.map((ev) => (
                        <div key={ev.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileCheck2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { reset(); }}>
                      Inspect Another Repository
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { window.location.href = '/evidence'; }}>
                      View Evidence
                      <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Integrations */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {otherIntegrations.map((int) => (
          <Card key={int.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ring-1 ring-border">
                  <Plug className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm">{int.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{int.category}</p>
                </div>
              </div>
              <Badge variant="secondary">
                <CircleDashed className="mr-1 h-3 w-3" />
                Available
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{int.description}</p>
              <Button variant="outline" size="sm" className="mt-4 w-full" disabled>
                Connect
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SignalRow({
  signal,
  controls,
  selected,
  onToggle,
  controlId,
  onControlChange,
  selectable,
}: {
  signal: GitHubSignal;
  controls: ControlWithFramework[];
  selected: boolean;
  onToggle: () => void;
  controlId: string;
  onControlChange: (id: string) => void;
  selectable: boolean;
}) {
  return (
    <div className={`rounded-md border p-3 transition-colors ${selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-background/50'}`}>
      <div className="flex items-start gap-3">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="mt-0.5"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {signal.detected ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : signal.notChecked ? (
              <CircleDashed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            )}
            <span className="text-sm font-medium text-foreground">{signal.label}</span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {categoryLabels[signal.category] ?? signal.category}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{signal.detail}</p>
          {signal.sourceUrl && (
            <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
              <ExternalLink className="h-2.5 w-2.5" />
              {signal.detected ? 'View file' : 'Repository link'}
            </a>
          )}
          {selected && (
            <div className="mt-2">
              <Label className="text-[10px] text-muted-foreground">Map to control</Label>
              <Select value={controlId || 'none'} onValueChange={(v) => onControlChange(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a control" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose a control...</SelectItem>
                  {controls.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.reference} — {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <span className={`text-xs font-medium shrink-0 ${signal.detected ? 'text-primary' : signal.notChecked ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
          {signal.detected ? 'Present' : signal.notChecked ? 'Not checked' : 'Absent'}
        </span>
      </div>
    </div>
  );
}
