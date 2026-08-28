import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('PR template workflow boundary', () => {
  it('keeps PR metadata validation out of the application verification command', async () => {
    const verifyScript = await readFile('scripts/verify.mjs', 'utf8');

    expect(verifyScript).not.toContain("run('node', ['scripts/check-pr-template.mjs'])");
  });

  it('reruns the focused metadata check when a PR description or labels change', async () => {
    const workflow = await readFile('.github/workflows/pr-template.yml', 'utf8');

    expect(workflow).toContain('pull_request_target');
    expect(workflow).toContain('edited');
    expect(workflow).toContain('labeled');
    expect(workflow).toContain('unlabeled');
    expect(workflow).toContain('scripts/check-pr-template.mjs');
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(workflow).not.toContain('github.event.pull_request.head');
  });
});
