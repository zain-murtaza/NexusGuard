import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isBackboardConfigured, callBackboard, buildReviewPrompt, parseReviewContent, BackboardError } from '@/lib/backboard';

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

    const body = await req.json();
    const findingId = body?.findingId;
    if (!findingId || typeof findingId !== 'string') {
      return NextResponse.json({ error: 'Finding ID is required.' }, { status: 400, headers: corsHeaders });
    }

    // Derive organization from the user's membership — never from client input
    const { data: membership } = await supabase
      .from('org_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found for this user.' }, { status: 403, headers: corsHeaders });
    }

    const orgId = membership.organization_id;

    // Load the finding — RLS ensures only org-scoped findings are visible
    const { data: finding, error: findingError } = await supabase
      .from('findings')
      .select('*')
      .eq('id', findingId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (findingError || !finding) {
      return NextResponse.json({ error: 'Finding not found in your organization.' }, { status: 404, headers: corsHeaders });
    }

    // Load linked control
    let control: { reference: string; title: string; description: string | null } | null = null;
    if (finding.control_id) {
      const { data: ctrl } = await supabase
        .from('controls')
        .select('reference, title, description')
        .eq('id', finding.control_id)
        .maybeSingle();
      if (ctrl) control = ctrl;
    }

    // Load evidence linked to the control
    let evidenceItems: { id: string; title: string; description: string | null; status: string; source_type: string | null }[] = [];
    if (finding.control_id) {
      const { data: evItems } = await supabase
        .from('evidence')
        .select('id, title, description, status, source_type')
        .eq('organization_id', orgId)
        .eq('control_id', finding.control_id);
      if (evItems) evidenceItems = evItems;
    }

    // Load remediation tasks for this finding
    let remediationTasks: { title: string; status: string; assignee: string | null }[] = [];
    const { data: tasks } = await supabase
      .from('remediation_tasks')
      .select('title, status, assignee')
      .eq('organization_id', orgId)
      .eq('finding_id', findingId);
    if (tasks) remediationTasks = tasks;

    // Check if Backboard is configured
    if (!isBackboardConfigured()) {
      return NextResponse.json({
        error: 'AI review is not configured. A server-side BACKBOARD_API_KEY is required.',
        code: 'not_configured',
      }, { status: 503, headers: corsHeaders });
    }

    const apiKey = process.env.BACKBOARD_API_KEY as string;
    const prompt = buildReviewPrompt({
      findingTitle: finding.title,
      findingDescription: finding.description,
      findingSeverity: finding.severity,
      findingStatus: finding.status,
      findingReasoning: finding.reasoning,
      controlReference: control?.reference ?? null,
      controlTitle: control?.title ?? null,
      controlDescription: control?.description ?? null,
      evidenceItems,
      remediationTasks,
    });

    let backboardResult;
    try {
      backboardResult = await callBackboard(prompt, apiKey);
    } catch (err) {
      const bbErr = err as BackboardError;
      const statusCode = bbErr.type === 'auth' ? 503 : bbErr.type === 'rate_limit' ? 429 : bbErr.type === 'timeout' ? 504 : 502;
      return NextResponse.json({
        error: bbErr.message,
        code: bbErr.type,
      }, { status: statusCode, headers: corsHeaders });
    }

    const parsed = parseReviewContent(backboardResult.content);
    if (!parsed) {
      return NextResponse.json({
        error: 'The AI response could not be parsed into a valid review structure.',
        code: 'malformed',
      }, { status: 502, headers: corsHeaders });
    }

    // Persist the review as an ai_analysis_runs record
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: runRecord, error: runError } = await adminClient
      .from('ai_analysis_runs')
      .insert({
        organization_id: orgId,
        run_type: 'ai_review',
        status: 'completed',
        input_summary: `AI review of finding: ${finding.title}`,
        result_summary: parsed.review_summary.slice(0, 200),
        findings_count: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        engine_version: 'backboard',
        rule_version: 'n/a',
        controls_analyzed: 0,
        controls_covered: 0,
        controls_gapped: 0,
        finding_id: findingId,
        provider: 'backboard',
        model_name: backboardResult.model,
        review_content: parsed,
        thread_id: backboardResult.thread_id,
      })
      .select('*')
      .single();

    if (runError) {
      return NextResponse.json({ error: 'Failed to persist AI review.' }, { status: 500, headers: corsHeaders });
    }

    // Audit event — no secrets or sensitive text
    await adminClient.from('audit_events').insert({
      organization_id: orgId,
      actor: user.email ?? 'unknown',
      action: 'ai_review.request',
      entity_type: 'finding',
      entity_id: findingId,
      metadata: {
        run_id: runRecord.id,
        provider: 'backboard',
        model: backboardResult.model,
      },
    });

    return NextResponse.json({
      review: parsed,
      runId: runRecord.id,
    }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({
      error: 'An unexpected error occurred during AI review.',
    }, { status: 500, headers: corsHeaders });
  }
}
