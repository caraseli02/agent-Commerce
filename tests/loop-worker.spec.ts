import { describe, expect, it } from 'vitest';

import { repairPrompt, sandboxProfile, startResponsesProxy, validateChangeSize } from '../scripts/loop-worker.mjs';

const HEAD = 'a'.repeat(40);
const action = {
  signal: { kind: 'ci-failure', sourceUrl: 'https://example.test/run/1', instruction: '' },
};
const pr = { number: 42, head: HEAD };

describe('local repair worker boundary', () => {
  it('redacts credential-shaped evidence and forbids publication', () => {
    const prompt = repairPrompt({ action, pr, evidence: 'failure ghp_abcdefghijklmnopqrstuvwxyz123456 and sk-secretsecretsecret' });
    expect(prompt).toContain('[redacted]');
    expect(prompt).not.toContain('ghp_');
    expect(prompt).not.toContain('sk-secret');
    expect(prompt).toContain('Do not use network access');
    expect(prompt).toContain('commit, push, merge');
  });

  it('allows only the worktree/runtime to be written and only Codex to use network', () => {
    const profile = sandboxProfile({
      worktree: '/private/tmp/worktree',
      runtimeRoot: '/private/tmp/runtime',
      gitRoot: '/repo/.git',
      codexBin: '/Applications/ChatGPT.app/Contents/Resources/codex',
    });
    expect(profile).toContain('(deny file-read*)');
    expect(profile).toContain('(deny file-write*)');
    expect(profile).toContain('(deny process-info*)');
    expect(profile).toContain('(deny process-exec (literal "/usr/bin/security"))');
    expect(profile).toContain('(global-name "com.apple.SecurityServer")');
    expect(profile).toContain('(global-name "com.apple.securityd.xpc")');
    expect(profile).toContain('(deny network*)');
    expect(profile).toContain('(allow network* (process-path');
    expect(profile).toContain('(deny file-write* (literal "/private/tmp/worktree/.git") (subpath "/repo/.git"))');
    expect(profile).not.toContain('.codex/auth.json');
  });

  it('rejects requests without the disposable proxy token', async () => {
    const proxy = await startResponsesProxy('never-forwarded-secret');
    try {
      const response = await fetch(`${proxy.baseUrl}/responses`, { method: 'POST', body: '{}' });
      expect(response.status).toBe(401);
    } finally {
      await proxy.close();
    }
  });

  it('rejects broad or binary worker changes before publication', () => {
    expect(() => validateChangeSize('100\t50\tone.ts\n20\t10\ttwo.ts')).not.toThrow();
    expect(() => validateChangeSize('1000\t201\tlarge.ts')).toThrow('scope limit');
    expect(() => validateChangeSize('-\t-\tbinary.dat')).toThrow('scope limit');
  });

  it('rejects proxy paths other than the Responses API', async () => {
    const proxy = await startResponsesProxy('never-forwarded-secret');
    try {
      const response = await fetch(`${proxy.baseUrl}/models`, {
        method: 'POST',
        headers: { authorization: `Bearer ${proxy.token}` },
        body: '{}',
      });
      expect(response.status).toBe(403);
    } finally {
      await proxy.close();
    }
  });
});
