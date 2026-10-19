import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('PR template workflow boundary', () => {
  it('keeps PR metadata validation out of the application verification command', async () => {
    const verifyScript = await readFile('scripts/verify.mjs', 'utf8');

    expect(verifyScript).not.toContain("run('node', ['scripts/check-pr-template.mjs'])");
  });

  it('retires the hosted metadata workflow', async () => {
    await expect(readFile('.github/workflows/pr-template.yml')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
