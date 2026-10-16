import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFile(`.github/workflows/${name}.yml`, 'utf8');

// Evaluate the actual job expression, rather than a second implementation of its filter.
async function admits(eventName: string, event: Record<string, unknown> = {}) {
  const workflow = await read('owner-attention');
  const condition = workflow.match(/ {4}if: >-\n((?: {6}.+\n)+)/)?.[1];
  expect(condition, 'Keep the owner job admission expression folded and covered by this event matrix.').toBeTruthy();
  return Boolean(
    runInNewContext(condition!, {
      github: { event_name: eventName, event },
      contains: (value: string | undefined, search: string) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search.toLowerCase()),
    }),
  );
}

const commentEvent = (body: string, options: { previous?: string; bot?: boolean; pr?: boolean } = {}) => ({
  issue: { pull_request: options.pr === false ? undefined : {}, labels: [] },
  comment: { body, user: { login: options.bot ? 'github-actions[bot]' : 'caraseli02' } },
  changes: { body: { from: options.previous } },
});

describe('CI cost controls', () => {
  it.each(['schedule', 'workflow_dispatch', 'workflow_run', 'issues', 'pull_request_target', 'pull_request_review'])(
    'retains the %s reconciliation signal',
    async (name) => expect(await admits(name)).toBe(true),
  );

  it('skips ordinary PR discussion and its edits before allocating a runner', async () => {
    expect(await admits('issue_comment', commentEvent('Looks good'))).toBe(false);
    expect(await admits('issue_comment', commentEvent('Updated discussion', { previous: 'Thanks' }))).toBe(false);
    expect(await admits('issue_comment', commentEvent('## Evaluator verdict\nPASS', { bot: true }))).toBe(false);
  });

  it('retains modern/legacy reports, edited verdicts and report retractions', async () => {
    for (const marker of ['<!-- evaluator-head: abc -->', '<!-- local-evaluator sha=abc -->']) {
      expect(await admits('issue_comment', commentEvent(`${marker}\n## Evaluator verdict\nPASS`))).toBe(true);
    }
    expect(await admits('issue_comment', commentEvent('## Evaluator verdict\nFAIL', { previous: '## Evaluator verdict\nPASS' }))).toBe(
      true,
    );
    expect(await admits('issue_comment', commentEvent('Withdrawn', { previous: '## Evaluator verdict\nPASS' }))).toBe(true);
    expect(await admits('issue_comment', commentEvent('## Evaluator verdict\nPASS', { pr: false }))).toBe(false);
  });

  it('preserves the hourly window, serialization, trusted checkout and hosted production jobs', async () => {
    const owner = await read('owner-attention');
    expect(owner).toContain("cron: '20 7-19 * * *'");
    expect(owner).toMatch(/group: owner-attention\s+cancel-in-progress: false/);
    for (const name of ['owner-attention', 'pr-template']) {
      const workflow = await read(name);
      expect(workflow).toContain('runs-on: ubuntu-latest');
      expect(workflow).toContain('ref: ${{ github.event.repository.default_branch }}');
      expect(workflow).toContain('persist-credentials: false');
      expect(workflow).not.toContain('github.event.pull_request.head');
    }
    expect(await read('pr-template')).toContain('name: check');
  });

  it('cancels superseded commits only within the same PR and never cancels main verification', async () => {
    const workflow = await read('ci');
    expect(workflow).toContain('group: ci-${{ github.event.pull_request.number || github.run_id }}');
    expect(workflow).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
    expect(workflow).toContain('runs-on: ubuntu-latest');
    expect(workflow).toContain('pnpm verify --base "$VERIFY_BASE"');
    expect(workflow).toContain('cache: pnpm');
    expect(workflow).toContain('image: postgres:17-alpine');
  });

  it('rejects disabled, non-owner and non-main probe dispatches', async () => {
    const workflow = await read('notifications-runner-probe');
    const condition = workflow.match(/ {4}if: >-\n((?: {6}.+\n)+)/)?.[1];
    expect(condition).toBeTruthy();
    const evaluate = (enabled: string | undefined, actor = 'caraseli02', ref = 'refs/heads/main') =>
      Boolean(
        runInNewContext(condition!, {
          vars: { NOTIFICATIONS_RUNNER_PROBE_ENABLED: enabled },
          github: { actor, ref, repository_owner: 'caraseli02', event: { repository: { default_branch: 'main' } } },
          format: (pattern: string, branch: string) => pattern.replace('{0}', branch),
        }),
      );
    expect(evaluate(undefined)).toBe(false);
    expect(evaluate('false')).toBe(false);
    expect(evaluate('true', 'other-user')).toBe(false);
    expect(evaluate('true', 'caraseli02', 'refs/heads/feature')).toBe(false);
    expect(evaluate('true')).toBe(true);
  });

  it('stages an owner-enabled main-only probe with no checkout or PR code execution', async () => {
    const workflow = await read('notifications-runner-probe');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/pull_request:|pull_request_target:|schedule:|uses:|checkout/);
    expect(workflow).toContain("vars.NOTIFICATIONS_RUNNER_PROBE_ENABLED == 'true'");
    expect(workflow).toContain("github.ref == format('refs/heads/{0}', github.event.repository.default_branch)");
    expect(workflow).toContain('github.actor == github.repository_owner');
    expect(workflow).toContain('runs-on: [self-hosted, macOS, ARM64, mac-mini-notifications]');
    expect(workflow).toContain('timeout-minutes: 5');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toMatch(/:\s*write|secrets\.|github.token/);
    expect(workflow).toContain('github-notifications');
    expect(workflow).toContain('id -Gn');
  });
});
