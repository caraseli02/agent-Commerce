import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const accountFormPath = resolve('app/components/layout/account-modal/Form.vue');

describe('account demo credentials', () => {
  it('keeps demo passwords hidden while preserving role-based sign-in', () => {
    const source = readFileSync(accountFormPath, 'utf8');

    expect(source).toContain('Hidden for demo sign-in');
    expect(source).toContain('Demo passwords stay hidden');
    expect(source).toContain(
      'const resolvePasswordForSignin = () => password.value.value || LOGIN_CREDENTIALS[selectedLoginRole.value].password',
    );
    expect(source).toContain('password: passwordForSignin');
    expect(source).toContain("password.value.value = ''");
    expect(source).not.toContain('password.value.value = LOGIN_CREDENTIALS[role].password');
  });
});
