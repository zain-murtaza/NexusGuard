import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signalToEvidenceTitle, signalToEvidenceDescription, GitHubSignal, GitHubInspectionResult } from '@/lib/github';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

interface ImportItem {
  signal: GitHubSignal;
  controlId: string;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: corsHeaders });
    }

    const { data: membership } = await supabase
      .from('org_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found for this user.' }, { status: 403, headers: corsHeaders });
    }

    const orgId = membership.organization_id;

    const body = await req.json();
    const repoFullName = body?.repoFullName;
    const repoUrl = body?.repoUrl;
    const items = body?.items as ImportItem[] | undefined;

    if (!repoFullName || typeof repoFullName !== 'string') {
      return NextResponse.json({ error: 'Repository full name is required.' }, { status: 400, headers: corsHeaders });
    }
    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json({ error: 'Repository URL is required.' }, { status: 400, headers: corsHeaders });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one observation must be selected for import.' }, { status: 400, headers: corsHeaders });
    }

    for (const item of items) {
      if (!item.signal || typeof item.signal !== 'object' || !item.controlId || typeof item.controlId !== 'string') {
        return NextResponse.json({ error: 'Each import item requires a signal and a control ID.' }, { status: 400, headers: corsHeaders });
      }
    }

    // Verify all control IDs belong to the shared controls table (controls are global reference data)
    const controlIds = items.map((i) => i.controlId);
    const { data: validControls } = await supabase
      .from('controls')
      .select('id')
      .in('id', controlIds);

    const validControlIds = new Set((validControls ?? []).map((c: { id: string }) => c.id));
    const invalidControls = controlIds.filter((id) => !validControlIds.has(id));
    if (invalidControls.length > 0) {
      return NextResponse.json({ error: 'One or more selected controls do not exist.' }, { status: 400, headers: corsHeaders });
    }

    // Check for existing evidence to deduplicate — match on title + organization + source_type = 'GitHub'
    const titlesToImport = items.map((i) => signalToEvidenceTitle(i.signal, repoFullName));
    const { data: existingEvidence } = await supabase
      .from('evidence')
      .select('id, title, source_reference')
      .eq('organization_id', orgId)
      .eq('source_type', 'GitHub')
      .in('title', titlesToImport);

    const existingTitles = new Set((existingEvidence ?? []).map((e: { title: string; source_reference: string | null }) => {
      const ref = e.source_reference ?? '';
      return `${e.title}::${ref}`;
    }));

    const toInsert = items.filter((item) => {
      const title = signalToEvidenceTitle(item.signal, repoFullName);
      const sourceRef = item.signal.sourceUrl ?? repoUrl;
      return !existingTitles.has(`${title}::${sourceRef}`);
    });

    const skipped = items.length - toInsert.length;

    if (toInsert.length === 0) {
      return NextResponse.json({
        imported: [],
        skipped: items.length,
        message: 'All selected observations already exist as evidence records. No duplicates were created.',
      }, { status: 200, headers: corsHeaders });
    }

    const evidenceRows = toInsert.map((item) => ({
      organization_id: orgId,
      control_id: item.controlId,
      title: signalToEvidenceTitle(item.signal, repoFullName),
      description: signalToEvidenceDescription(item.signal, repoFullName, repoUrl),
      source_type: 'GitHub',
      source_reference: item.signal.sourceUrl ?? repoUrl,
      collection_method: 'GitHub public repository inspection',
      status: 'collected',
      collected_at: new Date().toISOString(),
      is_sample: false,
    }));

    const { data: insertedEvidence, error: insertError } = await supabase
      .from('evidence')
      .insert(evidenceRows)
      .select('id, title, control_id');

    if (insertError) {
      return NextResponse.json({ error: 'Failed to import evidence records.' }, { status: 500, headers: corsHeaders });
    }

    // Create audit events
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const auditPromises = (insertedEvidence ?? []).map((ev: { id: string; title: string }) =>
      adminClient.from('audit_events').insert({
        organization_id: orgId,
        actor: user.email ?? 'unknown',
        action: 'github.import_evidence',
        entity_type: 'evidence',
        entity_id: ev.id,
        metadata: {
          title: ev.title,
          repository: repoFullName,
          source: 'github_public_repo',
        },
      })
    );
    await Promise.all(auditPromises);

    return NextResponse.json({
      imported: (insertedEvidence ?? []).map((ev: { id: string; title: string }) => ({ id: ev.id, title: ev.title })),
      skipped,
      message: `${insertedEvidence?.length ?? 0} evidence record(s) imported.${skipped > 0 ? ` ${skipped} duplicate(s) skipped.` : ''}`,
    }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({
      error: 'An unexpected error occurred during evidence import.',
    }, { status: 500, headers: corsHeaders });
  }
}
