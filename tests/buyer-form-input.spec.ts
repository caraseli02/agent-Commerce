import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

const buyerPathFiles = [
  'app/components/signup/BusinessDetails.vue',
  'app/components/signup/ContactDetails.vue',
  'app/components/signup/PersonalDetails.vue',
  'app/components/signup/ProfileDetails.vue',
  'app/components/layout/account-modal/Form.vue',
  'app/pages/forgot-password.vue',
  'app/pages/password-reset.vue',
];

const formInputPattern = /<\s*FormInput\b|from\s+['"][^'"]*FormInput/;

describe('buyer path FormInput retirement (#402)', () => {
  it('removes FormInput from scripted buyer-path forms and modal entry points', async () => {
    const violations: string[] = [];

    for (const relativePath of buyerPathFiles) {
      const contents = await readFile(join(repoRoot, relativePath), 'utf8');

      if (formInputPattern.test(contents)) {
        violations.push(relativePath);
      }
    }

    expect(violations).toEqual([]);
  });

  it('uses BuyerFormInput on account modal sign-in', async () => {
    const contents = await readFile(join(repoRoot, 'app/components/layout/account-modal/Form.vue'), 'utf8');

    expect(contents).toContain('<BuyerFormInput');
    expect(contents).not.toMatch(formInputPattern);
  });

  it('registers BuyerFormInput at the Nuxt auto-import path (not buyer/BuyerFormInput)', async () => {
    const movedAway = await readFile(join(repoRoot, 'app/components/buyer/BuyerFormInput.vue'), 'utf8').then(
      () => false,
      () => true,
    );
    const contents = await readFile(join(repoRoot, 'app/components/BuyerFormInput.vue'), 'utf8');

    expect(movedAway).toBe(true);
    expect(contents).toContain('label: {');
    expect(contents).toMatch(/label:\s*\{\s*type:\s*String,\s*required:\s*true/);
    expect(contents).not.toContain('pl-[52px]');
  });
});
