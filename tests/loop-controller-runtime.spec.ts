import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runControllerCycle } from '../scripts/loop-controller-runtime.mjs';

const HEAD = 'a'.repeat(40);
const snapshot = () => ({
  activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
  pr: {
    number: 42,
    branch: 'codex/repair-42',
    base: 'main',
    head: HEAD,
    linkedIssues: [7],
    trustedAuthor: true,
    targetSafe: true,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'UNSTABLE',
    checks: [
      {
        workflowName: 'CI',
        name: 'verify',
        status: 'COMPLETED',
        conclusion: 'FAILURE',
        detailsUrl: 'https://github.com/acme/repo/actions/runs/12345/job/9',
        completedAt: '2026-08-29T10:00:00Z',
      },
    ],
  },
  issueComments: [] as Array<ReturnType<typeof comment>>,
  reviews: [],
  reviewComments: [],
});
const paths = () => {
  const root = mkdtempSync(join(tmpdir(), 'ecas-loop-runtime-'));
  return { statePath: join(root, 'state.json'), summaryPath: join(root, 'summaries.jsonl') };
};
const github = (overrides: Record<string, unknown> = {}) => ({
  loadSnapshot: snapshot,
  refreshSnapshot: snapshot,
  repairEvidence: () => 'failure evidence',
  blockIssue: () => {},
  promoteIssue: () => {},
  ...overrides,
});
const worker = (overrides: Record<string, unknown> = {}) => ({
  repair: async () => ({ publishedHead: 'b'.repeat(40) }),
  ...overrides,
});
const readState = (statePath: string) => JSON.parse(readFileSync(statePath, 'utf8'));

describe('local repair controller lifecycle', () => {
  it('consumes the attempt before starting the local worker', async () => {
    const runtimePaths = paths();
    let received: Record<string, unknown> = {};
    const result = await runControllerCycle({
      github: github({ repairEvidence: () => 'focused test failed' }),
      worker: worker({
        repair: async (value: Record<string, unknown>) => {
          received = value;
          expect(readState(runtimePaths.statePath).attemptsByPr['42']).toBe(1);
          return { publishedHead: 'b'.repeat(40) };
        },
      }),
      ...runtimePaths,
      now: () => '2026-08-29T10:01:00.000Z',
    });

    expect(result).toMatchObject({ type: 'dispatch', repaired: true, publishedHead: 'b'.repeat(40) });
    expect(received).toMatchObject({ evidence: 'focused test failed', pr: { head: HEAD } });
    expect(readState(runtimePaths.statePath).dispatches).toEqual(
      expect.objectContaining({ [`ci-failure:12345:${HEAD}`]: expect.objectContaining({ result: 'published', countedAttempt: true }) }),
    );
    expect(readFileSync(runtimePaths.summaryPath, 'utf8')).toContain('"role":"local-repair"');
  });

  it('keeps observe-only free of local and GitHub mutations', async () => {
    const runtimePaths = paths();
    let mutations = 0;
    const mutation = () => {
      mutations += 1;
    };
    await expect(
      runControllerCycle({
        github: github({ blockIssue: mutation, promoteIssue: mutation }),
        worker: worker({ repair: mutation }),
        ...runtimePaths,
        observeOnly: true,
      }),
    ).resolves.toMatchObject({ type: 'dispatch', observeOnly: true });
    expect(mutations).toBe(0);
    expect(() => readState(runtimePaths.statePath)).toThrow();
  });

  it('aborts when the exact-head decision changes', async () => {
    const runtimePaths = paths();
    const refreshed = snapshot();
    refreshed.pr.head = 'b'.repeat(40);
    let repairs = 0;
    await expect(
      runControllerCycle({
        github: github({ refreshSnapshot: () => refreshed }),
        worker: worker({ repair: async () => repairs++ }),
        ...runtimePaths,
      }),
    ).resolves.toEqual({ type: 'idle', reason: 'decision-changed-before-mutation' });
    expect(repairs).toBe(0);
    expect(() => readState(runtimePaths.statePath)).toThrow();
  });

  it('charges failed workers and blocks after two attempts', async () => {
    const runtimePaths = paths();
    let blocks = 0;
    const adapter = github({ blockIssue: () => blocks++ });
    const localWorker = worker({ repair: async () => Promise.reject(new Error('worker failed')) });
    const cycle = () => runControllerCycle({ github: adapter, worker: localWorker, ...runtimePaths });

    await expect(cycle()).rejects.toThrow('worker failed');
    await expect(cycle()).rejects.toThrow('worker failed');
    await expect(cycle()).resolves.toMatchObject({ type: 'blocked', blocked: true });
    expect(readState(runtimePaths.statePath).attemptsByPr['42']).toBe(2);
    expect(blocks).toBe(1);
  });

  it('revalidates the complete WIP decision after evidence retrieval', async () => {
    const runtimePaths = paths();
    let refreshes = 0;
    let repairs = 0;
    const unclaimed = snapshot();
    unclaimed.activeIssues = [];
    await expect(
      runControllerCycle({
        github: github({ refreshSnapshot: () => (++refreshes === 1 ? snapshot() : unclaimed) }),
        worker: worker({ repair: async () => repairs++ }),
        ...runtimePaths,
      }),
    ).resolves.toEqual({ type: 'idle', reason: 'decision-changed-before-repair' });
    expect(repairs).toBe(0);
    expect(readState(runtimePaths.statePath).attemptsByPr['42']).toBe(1);
  });

  it('rejects an edited repair instruction with the same source and head', async () => {
    const runtimePaths = paths();
    const initial = snapshot();
    initial.pr.checks = [];
    initial.issueComments = [comment(`/repair ${HEAD} Fix only checkout.`)];
    const edited = structuredClone(initial);
    edited.issueComments[0]!.body = `/repair ${HEAD} Replace checkout.`;
    let refreshes = 0;
    let repairs = 0;
    await expect(
      runControllerCycle({
        github: github({
          loadSnapshot: () => initial,
          refreshSnapshot: () => (++refreshes === 1 ? initial : edited),
          repairEvidence: (signal: { instruction?: string }) => signal.instruction ?? '',
        }),
        worker: worker({ repair: async () => repairs++ }),
        ...runtimePaths,
      }),
    ).resolves.toEqual({ type: 'idle', reason: 'decision-changed-before-repair' });
    expect(repairs).toBe(0);
  });
});

function comment(body: string) {
  return {
    id: 77,
    body,
    author_association: 'OWNER',
    created_at: '2026-08-29T10:00:00Z',
    html_url: 'https://github.com/acme/repo/pull/42#issuecomment-77',
  };
}
