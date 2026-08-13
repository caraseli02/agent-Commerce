import { describe, expect, it } from 'vitest';

import { boundedEvidence, repairPrompt, sandboxProfile } from '../scripts/loop-worker.mjs';

describe('local repair worker contract', () => {
  const pr = { number: 478, head: 'a'.repeat(40) };
  for (const [kind, instruction] of [
    ['repair-command', 'Fix the checkout assertion.'],
    ['inline-review', 'This branch is reversed.'],
    ['changes-requested', 'Add the missing guard.'],
    ['qodo-review', 'Action required: validate input.'],
    ['greptile-review', 'Issue 1: avoid a secret leak.'],
    ['ci-failure', 'verify: expected true to be false'],
  ]) {
    it(`passes bounded exact-head ${kind} evidence to the offline worker`, () => {
      const prompt = repairPrompt({ pr, signal: { kind, sourceUrl: 'https://github.test/source', instruction, evidence: instruction } });
      expect(prompt).toContain(`exact head ${pr.head}`);
      expect(prompt).toContain(instruction);
      expect(prompt).toContain('Do not use network');
    });
  }

  it('redacts token-shaped evidence and bounds it', () => {
    expect(boundedEvidence(`ghp_abcdefghijklmnopqrstuvwxyz123456 ${'x'.repeat(20_000)}`)).toContain('[redacted]');
    expect(boundedEvidence('x'.repeat(20_000))).toHaveLength(12_000);
  });

  it('uses an OS profile with only worktree and copied auth reads', () => {
    const profile = sandboxProfile({ worktree: '/tmp/repair', codexHome: '/tmp/repair/.codex-auth' });
    expect(profile).toContain('(deny default)');
    expect(profile).toContain('/tmp/repair/.codex-auth');
    expect(profile).not.toContain('/Users');
  });
});
