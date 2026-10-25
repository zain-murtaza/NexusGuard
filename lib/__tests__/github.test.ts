import { parseGitHubUrl, signalToEvidenceTitle, signalToEvidenceDescription } from '../github';
import type { GitHubSignal } from '@/lib/types';

describe('parseGitHubUrl', () => {
  it('parses a standard HTTPS GitHub URL', () => {
    expect(parseGitHubUrl('https://github.com/octocat/Hello-World')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });

  it('parses a URL with trailing slash', () => {
    expect(parseGitHubUrl('https://github.com/octocat/Hello-World/')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });

  it('parses a URL with .git suffix', () => {
    expect(parseGitHubUrl('https://github.com/octocat/Hello-World.git')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });

  it('parses a bare github.com path', () => {
    expect(parseGitHubUrl('github.com/octocat/Hello-World')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });

  it('parses an owner/repo shorthand', () => {
    expect(parseGitHubUrl('octocat/Hello-World')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });

  it('rejects non-GitHub hosts', () => {
    expect(parseGitHubUrl('https://gitlab.com/octocat/Hello-World')).toBeNull();
    expect(parseGitHubUrl('https://bitbucket.org/octocat/Hello-World')).toBeNull();
  });

  it('rejects URLs with embedded credentials', () => {
    expect(parseGitHubUrl('https://user:pass@github.com/octocat/Hello-World')).toBeNull();
  });

  it('rejects URLs with query strings', () => {
    expect(parseGitHubUrl('https://github.com/octocat/Hello-World?tab=readme')).toBeNull();
  });

  it('rejects URLs with extra path segments', () => {
    expect(parseGitHubUrl('https://github.com/octocat/Hello-World/issues')).toBeNull();
    expect(parseGitHubUrl('https://github.com/octocat/Hello-World/tree/main')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(parseGitHubUrl('')).toBeNull();
    expect(parseGitHubUrl('   ')).toBeNull();
  });

  it('rejects URLs with only one segment', () => {
    expect(parseGitHubUrl('https://github.com/octocat')).toBeNull();
  });

  it('rejects malformed owner names', () => {
    expect(parseGitHubUrl('https://github.com/-invalid/Hello-World')).toBeNull();
    expect(parseGitHubUrl('https://github.com/owner with space/Hello-World')).toBeNull();
  });

  it('rejects excessively long input', () => {
    expect(parseGitHubUrl('a'.repeat(600))).toBeNull();
  });

  it('rejects non-string input', () => {
    expect(parseGitHubUrl(null as unknown as string)).toBeNull();
    expect(parseGitHubUrl(undefined as unknown as string)).toBeNull();
  });

  it('accepts repos with dots and dashes', () => {
    expect(parseGitHubUrl('https://github.com/my-org/my.repo.name')).toEqual({ owner: 'my-org', repo: 'my.repo.name' });
  });
});

describe('signalToEvidenceTitle', () => {
  const signal: GitHubSignal = {
    key: 'security_md',
    label: 'SECURITY.md',
    detected: true,
    sourceUrl: 'https://github.com/owner/repo/blob/main/SECURITY.md',
    detail: 'A security policy file is present.',
    category: 'policy',
    notChecked: false,
  };

  it('creates a title with signal label, status, and repo name', () => {
    const title = signalToEvidenceTitle(signal, 'owner/repo');
    expect(title).toBe('GitHub: SECURITY.md present in owner/repo');
  });

  it('reflects absent status in the title', () => {
    const absentSignal = { ...signal, detected: false };
    const title = signalToEvidenceTitle(absentSignal, 'owner/repo');
    expect(title).toContain('absent');
  });
});

describe('signalToEvidenceDescription', () => {
  const signal: GitHubSignal = {
    key: 'codeowners',
    label: 'CODEOWNERS',
    detected: true,
    sourceUrl: 'https://github.com/owner/repo/blob/main/CODEOWNERS',
    detail: 'A CODEOWNERS file is present.',
    category: 'code-review',
    notChecked: false,
  };

  it('includes repository name, signal, status, detail, and source URL', () => {
    const desc = signalToEvidenceDescription(signal, 'owner/repo', 'https://github.com/owner/repo');
    expect(desc).toContain('owner/repo');
    expect(desc).toContain('CODEOWNERS');
    expect(desc).toContain('Present');
    expect(desc).toContain('CODEOWNERS file is present');
    expect(desc).toContain('github.com/owner/repo/blob/main/CODEOWNERS');
  });

  it('shows Not checked for notChecked signals', () => {
    const notChecked = { ...signal, detected: false, notChecked: true, sourceUrl: null };
    const desc = signalToEvidenceDescription(notChecked, 'owner/repo', 'https://github.com/owner/repo');
    expect(desc).toContain('Not checked');
    expect(desc).toContain('N/A');
  });
});
