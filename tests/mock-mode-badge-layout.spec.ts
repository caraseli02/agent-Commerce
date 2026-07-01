import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const defaultLayoutPath = resolve('layouts/default.vue');

describe('mock mode badge layout', () => {
  it('uses an in-flow mobile badge and only floats it from the medium breakpoint', () => {
    const source = readFileSync(defaultLayoutPath, 'utf8');

    expect(source).toContain('data-testid="mock-mode-badge"');
    expect(source).toContain('self-end');
    expect(source).toContain('md:fixed');
    expect(source).toContain('md:bottom-4');
    expect(source).toContain('md:right-4');
    expect(source).not.toContain('class="fixed bottom-4 right-4');
  });
});
