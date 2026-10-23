'use client';

import { Settings, Shield, Bell, Users, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { useAppData } from '@/hooks/use-app-data';
import { LoadingState, ErrorState } from '@/components/state';

export default function SettingsPage() {
  const { organization, loading, error } = useAppData();

  if (loading) return <div className="p-6"><LoadingState label="Loading settings..." /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage workspace configuration and preferences"
      />
      {organization?.is_demo && <DemoBanner />}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Workspace Name</Label>
              <Input id="org-name" defaultValue={organization?.name ?? ''} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Workspace Slug</Label>
              <Input id="org-slug" defaultValue={organization?.slug ?? ''} readOnly />
            </div>
            <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15">
                <Shield className="h-4 w-4 text-orange-400" />
              </div>
              <p className="text-xs text-muted-foreground">
                This is a demonstration workspace. Organization settings are read-only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'New findings', desc: 'Get notified when AI analysis identifies new findings' },
              { label: 'Task deadlines', desc: 'Receive reminders for upcoming remediation deadlines' },
              { label: 'Evidence expiration', desc: 'Alert when evidence is about to expire' },
              { label: 'AI analysis completion', desc: 'Notify when an analysis run finishes' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch disabled />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Team management requires authentication and will be available when user accounts are enabled in a future phase.
            </p>
            <Button variant="outline" size="sm" className="mt-3" disabled>
              Invite Members
            </Button>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Data & Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Export your evidence, findings, and audit trail for compliance reporting.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Export Evidence</Button>
              <Button variant="outline" size="sm" disabled>Export Audit Trail</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
