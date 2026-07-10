import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const askDialogPath = resolve('components/product/AskDialog.vue');
const inputPath = resolve('components/ui/input/Input.vue');
const formMessagePath = resolve('components/ui/form/FormMessage.vue');

describe('ask about product validation', () => {
  it('requires email with field-level styling and accessible error text', () => {
    const askDialogSource = readFileSync(askDialogPath, 'utf8');
    const inputSource = readFileSync(inputPath, 'utf8');
    const formMessageSource = readFileSync(formMessagePath, 'utf8');

    expect(askDialogSource).toContain("min(1, 'Email is required')");
    expect(askDialogSource).toContain('Invalid email address');
    expect(askDialogSource).toContain('<FormMessage />');
    expect(inputSource).toContain('aria-invalid:border-rose-500');
    expect(formMessageSource).toContain('role="alert"');
  });
});
