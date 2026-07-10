import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const askDialogPath = resolve('components/product/AskDialog.vue');
const formMessagePath = resolve('components/ui/form/FormMessage.vue');

describe('ask about product validation', () => {
  it('requires email with field-level styling and accessible error text', () => {
    const askDialogSource = readFileSync(askDialogPath, 'utf8');
    const formMessageSource = readFileSync(formMessagePath, 'utf8');

    expect(askDialogSource).toContain("required_error: 'Email is required'");
    expect(askDialogSource).toContain('Invalid email address');
    expect(askDialogSource).toContain('<FormMessage />');
    expect(askDialogSource).toContain('border-rose-500 focus-visible:outline-rose-500');
    expect(formMessageSource).toContain('role="alert"');
  });
});
