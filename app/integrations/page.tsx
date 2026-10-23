'use client';

import { Plug, CheckCircle2, CircleDashed, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { DemoBanner } from '@/components/demo-banner';
import { useAuth } from '@/hooks/use-auth';

const integrations = [
  { name: 'Okta', category: 'Identity Provider', status: 'available', description: 'Sync SSO configuration and user access evidence.' },
  { name: 'GitHub', category: 'Source Control', status: 'available', description: 'Collect CI/CD pipeline logs and deployment approval records.' },
  { name: 'Splunk', category: 'SIEM', status: 'available', description: 'Export security alerts and incident response metrics.' },
  { name: 'AWS', category: 'Cloud Infrastructure', status: 'available', description: 'Gather cloud security posture and configuration evidence.' },
  { name: 'Datadog', category: 'Monitoring', status: 'available', description: 'Pull infrastructure monitoring and alert configuration.' },
  { name: '1Password', category: 'Secrets Management', status: 'available', description: 'Verify password policies and access vault configurations.' },
];

export default function IntegrationsPage() {
  const { organization } = useAuth();
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <PageHeader
        title="Integrations"
        description="Connect external systems to automate evidence collection"
      />
      {organization?.is_demo && <DemoBanner />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((int) => (
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

      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span>Integration connections require authentication setup and will be available in a future phase. No live connections are active in this demonstration workspace.</span>
      </div>
    </div>
  );
}
