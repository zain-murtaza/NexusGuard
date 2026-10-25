export interface GitHubSignal {
  key: string;
  label: string;
  detected: boolean;
  sourceUrl: string | null;
  detail: string;
  category: 'policy' | 'code-review' | 'dependencies' | 'ci-cd' | 'licensing' | 'documentation';
  notChecked: boolean;
}

export interface GitHubInspectionResult {
  repository: {
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    defaultBranch: string;
    url: string;
    isPrivate: boolean;
  };
  signals: GitHubSignal[];
  inspectedAt: string;
  rateLimitRemaining: number | null;
}

export interface GitHubInspectionError {
  type: 'invalid_url' | 'not_found' | 'rate_limit' | 'timeout' | 'network' | 'malformed' | 'private_repo';
  message: string;
}

const GITHUB_API = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 15000;

export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 500) return null;

  if (trimmed.includes('@') || trimmed.includes('://') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }

  let path: string;

  if (trimmed.startsWith('https://github.com/') || trimmed.startsWith('http://github.com/')) {
    const url = new URL(trimmed);
    if (url.hostname !== 'github.com') return null;
    if (url.searchParams.toString().length > 0) return null;
    if (url.username || url.password) return null;
    path = url.pathname;
  } else if (trimmed.startsWith('github.com/')) {
    path = '/' + trimmed.slice('github.com/'.length);
  } else if (/^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9._-]+\/?$/.test(trimmed)) {
    path = '/' + trimmed;
  } else {
    return null;
  }

  const segments = path.split('/').filter((s) => s.length > 0);
  if (segments.length !== 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');

  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(owner)) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(repo)) return null;
  if (repo.length > 100) return null;

  return { owner, repo };
}

async function githubFetch(path: string): Promise<{ data: unknown; status: number; remaining: number | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'NexusGuard-Evidence-Connector',
      },
      signal: controller.signal,
    });

    const remainingHeader = response.headers.get('x-ratelimit-remaining');
    const remaining = remainingHeader ? parseInt(remainingHeader, 10) : null;

    if (response.status === 403 && remaining === 0) {
      return { data: null, status: 403, remaining: 0 };
    }

    let data: unknown = null;
    if (response.status !== 404 && response.status !== 403) {
      data = await response.json();
    }

    return { data, status: response.status, remaining };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw { type: 'timeout' as const, message: 'GitHub API request timed out.' };
    }
    throw { type: 'network' as const, message: 'Unable to reach the GitHub API.' };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkFileExists(owner: string, repo: string, branch: string, filePath: string): Promise<boolean | null> {
  const result = await githubFetch(`/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`);
  if (result.status === 200) return true;
  if (result.status === 404) return false;
  return null;
}

export async function inspectRepository(owner: string, repo: string): Promise<GitHubInspectionResult> {
  const repoResult = await githubFetch(`/repos/${owner}/${repo}`);

  if (repoResult.status === 404) {
    throw { type: 'not_found' as const, message: `Repository ${owner}/${repo} was not found or is not publicly accessible.` };
  }
  if (repoResult.status === 403 && repoResult.remaining === 0) {
    throw { type: 'rate_limit' as const, message: 'GitHub API rate limit exceeded. Please try again later.' };
  }
  if (repoResult.status === 403) {
    throw { type: 'private_repo' as const, message: `Repository ${owner}/${repo} is not publicly accessible.` };
  }
  if (repoResult.status !== 200 || !repoResult.data) {
    throw { type: 'malformed' as const, message: 'GitHub API returned an unexpected response.' };
  }

  const repoData = repoResult.data as Record<string, unknown>;
  const isPrivate = repoData.private === true;
  if (isPrivate) {
    throw { type: 'private_repo' as const, message: `Repository ${owner}/${repo} is private and cannot be inspected.` };
  }

  const defaultBranch = (repoData.default_branch as string) ?? 'main';
  const description = (repoData.description as string) ?? null;
  const repoUrl = (repoData.html_url as string) ?? `https://github.com/${owner}/${repo}`;

  const baseUrl = `https://github.com/${owner}/${repo}`;
  const branchBaseUrl = `${baseUrl}/blob/${defaultBranch}`;

  const checks: Array<{ key: string; label: string; filePath: string; detail: string; category: GitHubSignal['category'] }> = [
    { key: 'readme', label: 'README', filePath: 'README.md', detail: 'A README file is present in the repository root.', category: 'documentation' },
    { key: 'security_md', label: 'SECURITY.md', filePath: 'SECURITY.md', detail: 'A security policy file is present in the repository root.', category: 'policy' },
    { key: 'codeowners', label: 'CODEOWNERS', filePath: 'CODEOWNERS', detail: 'A CODEOWNERS file is present, indicating code review ownership rules.', category: 'code-review' },
    { key: 'dependabot_yml', label: 'Dependabot config (.yml)', filePath: '.github/dependabot.yml', detail: 'A Dependabot configuration file is present under .github/.', category: 'dependencies' },
    { key: 'dependabot_yaml', label: 'Dependabot config (.yaml)', filePath: '.github/dependabot.yaml', detail: 'A Dependabot configuration file is present under .github/.', category: 'dependencies' },
    { key: 'license', label: 'LICENSE', filePath: 'LICENSE', detail: 'A license file is present in the repository root.', category: 'licensing' },
  ];

  const signals: GitHubSignal[] = [];

  for (const check of checks) {
    const exists = await checkFileExists(owner, repo, defaultBranch, check.filePath);
    signals.push({
      key: check.key,
      label: check.label,
      detected: exists === true,
      sourceUrl: exists === true ? `${branchBaseUrl}/${check.filePath}` : null,
      detail: check.detail,
      category: check.category,
      notChecked: exists === null,
    });
  }

  const workflowsResult = await githubFetch(`/repos/${owner}/${repo}/contents/.github/workflows?ref=${defaultBranch}`);
  let workflowFiles: { name: string; html_url: string }[] = [];
  if (workflowsResult.status === 200 && Array.isArray(workflowsResult.data)) {
    workflowFiles = (workflowsResult.data as Array<Record<string, unknown>>)
      .filter((f) => typeof f.name === 'string' && (f.name.endsWith('.yml') || f.name.endsWith('.yaml')))
      .map((f) => ({ name: f.name as string, html_url: (f.html_url as string) ?? `${branchBaseUrl}/.github/workflows/${f.name}` }))
      .slice(0, 10);
  }

  signals.push({
    key: 'github_actions',
    label: 'GitHub Actions workflows',
    detected: workflowFiles.length > 0,
    sourceUrl: workflowFiles.length > 0 ? `${baseUrl}/actions` : null,
    detail: workflowFiles.length > 0
      ? `${workflowFiles.length} workflow file(s) detected under .github/workflows/: ${workflowFiles.map((w) => w.name).join(', ')}.`
      : 'No GitHub Actions workflow files were found under .github/workflows/.',
    category: 'ci-cd',
    notChecked: workflowsResult.status !== 200 && workflowsResult.status !== 404,
  });

  const dependabotDetected = signals.find((s) => s.key === 'dependabot_yml')?.detected || signals.find((s) => s.key === 'dependabot_yaml')?.detected;
  signals.push({
    key: 'dependabot',
    label: 'Dependabot configuration',
    detected: !!dependabotDetected,
    sourceUrl: signals.find((s) => s.key === 'dependabot_yml')?.sourceUrl ?? signals.find((s) => s.key === 'dependabot_yaml')?.sourceUrl ?? null,
    detail: dependabotDetected
      ? 'A Dependabot configuration file was detected in the repository.'
      : 'No Dependabot configuration file was found in .github/.',
    category: 'dependencies',
    notChecked: false,
  });

  return {
    repository: {
      owner,
      name: repo,
      fullName: `${owner}/${repo}`,
      description,
      defaultBranch,
      url: repoUrl,
      isPrivate: false,
    },
    signals,
    inspectedAt: new Date().toISOString(),
    rateLimitRemaining: repoResult.remaining,
  };
}

export function signalToEvidenceTitle(signal: GitHubSignal, repoFullName: string): string {
  return `GitHub: ${signal.label} ${signal.detected ? 'present' : 'absent'} in ${repoFullName}`;
}

export function signalToEvidenceDescription(signal: GitHubSignal, repoFullName: string, repoUrl: string): string {
  const status = signal.detected ? 'Present' : signal.notChecked ? 'Not checked' : 'Not found';
  return `Repository: ${repoFullName} (${repoUrl})\nSignal: ${signal.label}\nStatus: ${status}\nDetail: ${signal.detail}\nSource: ${signal.sourceUrl ?? 'N/A'}`;
}
