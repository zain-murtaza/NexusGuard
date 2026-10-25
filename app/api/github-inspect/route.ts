import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseGitHubUrl, inspectRepository, GitHubInspectionError } from '@/lib/github';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

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

    const { data: membership } = await supabase
      .from('org_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found for this user.' }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const repoUrl = body?.repoUrl;
    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json({ error: 'Repository URL is required.' }, { status: 400, headers: corsHeaders });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json({
        error: 'Invalid GitHub URL. Please provide a valid public repository URL such as https://github.com/owner/repository.',
        code: 'invalid_url',
      }, { status: 400, headers: corsHeaders });
    }

    let result;
    try {
      result = await inspectRepository(parsed.owner, parsed.repo);
    } catch (err) {
      const ghErr = err as GitHubInspectionError;
      const statusCode = ghErr.type === 'rate_limit' ? 429 : ghErr.type === 'timeout' ? 504 : ghErr.type === 'not_found' ? 404 : ghErr.type === 'private_repo' ? 403 : 502;
      return NextResponse.json({
        error: ghErr.message,
        code: ghErr.type,
      }, { status: statusCode, headers: corsHeaders });
    }

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({
      error: 'An unexpected error occurred during repository inspection.',
    }, { status: 500, headers: corsHeaders });
  }
}
