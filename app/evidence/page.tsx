'use client';

import { useState, useMemo } from 'react';
import { FileCheck2, Search, Filter, Plus, Loader2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { LoadingState, ErrorState, EmptyState } from '@/components/state';
import { StatusBadge } from '@/components/status-badge';
import { useAppData } from '@/hooks/use-app-data';
import { useAuth } from '@/hooks/use-auth';
import { insertEvidence } from '@/lib/queries';
import type { EvidenceStatus } from '@/lib/types';

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'verified', label: 'Verified' },
  { value: 'collected', label: 'Collected' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
];

const sourceTypes = ['Manual', 'API', 'Scanner', 'Document', 'Screenshot', 'Log Export'];
const collectionMethods = ['Manual upload', 'API integration', 'Automated scan', 'Third-party export'];

export default function EvidencePage() {
  const { evidence, controls, loading, error, refresh } = useAppData();
  const { user, organization } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    control_id: '',
    source_type: 'Manual',
    source_reference: '',
    collection_method: 'Manual upload',
  });

  const filtered = useMemo(() => {
    return evidence.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [evidence, search, statusFilter]);

  if (loading) return <div className="p-6"><LoadingState label="Loading evidence..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  async function handleInsertEvidence(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formData.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (formData.title.trim().length < 3) {
      setFormError('Title must be at least 3 characters.');
      return;
    }
    if (!organization || !user) return;

    setSubmitting(true);
    try {
      await insertEvidence(organization.id, user.email, {
        control_id: formData.control_id || null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        source_type: formData.source_type,
        source_reference: formData.source_reference.trim() || null,
        collection_method: formData.collection_method,
      });
      setDialogOpen(false);
      setFormData({ title: '', description: '', control_id: '', source_type: 'Manual', source_reference: '', collection_method: 'Manual upload' });
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add evidence.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Evidence"
        description="Collected security evidence items and their verification status"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add Evidence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Evidence</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInsertEvidence} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ev-title">Title</Label>
                  <Input
                    id="ev-title"
                    placeholder="e.g., Q4 Access Review Report"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-desc">Description</Label>
                  <Textarea
                    id="ev-desc"
                    placeholder="Brief description of this evidence..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Linked Control</Label>
                    <Select
                      value={formData.control_id || 'none'}
                      onValueChange={(v) => setFormData({ ...formData, control_id: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select control" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unlinked</SelectItem>
                        {controls.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source Type</Label>
                    <Select
                      value={formData.source_type}
                      onValueChange={(v) => setFormData({ ...formData, source_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sourceTypes.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ev-ref">Source Reference</Label>
                    <Input
                      id="ev-ref"
                      placeholder="e.g., URL or doc ID"
                      value={formData.source_reference}
                      onChange={(e) => setFormData({ ...formData, source_reference: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Collection Method</Label>
                    <Select
                      value={formData.collection_method}
                      onValueChange={(v) => setFormData({ ...formData, collection_method: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {collectionMethods.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">
                    {formError}
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Evidence'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {organization?.is_demo && <DemoBanner />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search evidence..."
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
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Collected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                          {e.description && (
                            <p className="truncate text-xs text-muted-foreground">{e.description}</p>
                          )}
                          {e.is_sample && (
                            <span className="mt-1 inline-block text-[10px] text-primary/70">Sample data</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {e.control ? (
                        <span className="text-sm text-foreground">{e.control.reference}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unlinked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{e.source_type ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge evidenceStatus={e.status as EvidenceStatus} />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.collected_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={FileCheck2}
              title="No evidence found"
              description={search || statusFilter !== 'all' ? "Try adjusting your filters." : "Add evidence to get started."}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
