import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// WCAG 1.4.11: control boundaries need 3:1 against the surfaces they sit on.
// Decision record: docs/adr/0002-control-boundary-contrast.md (#760).
const root = fileURLToPath(new URL('../', import.meta.url));
const css = readFileSync(`${root}app/assets/css/main.css`, 'utf8');

type Hsl = [number, number, number];

function themeBlock(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
}

function token(block: string, name: string): Hsl {
  const match = block.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%;`));
  expect(match, `--${name}`).not.toBeNull();
  return [Number(match![1]), Number(match![2]), Number(match![3])];
}

function luminance([h, s, l]: Hsl): number {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
}

function contrast(a: Hsl, b: Hsl): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('control boundary contrast (#760)', () => {
  it.each([
    [':root', ['background', 'card', 'muted', 'secondary']],
    ['.dark', ['background', 'card', 'muted', 'secondary']],
  ])('--input in %s reaches 3:1 against the surfaces controls sit on', (selector, surfaces) => {
    const block = themeBlock(selector);
    const input = token(block, 'input');

    for (const surface of surfaces) {
      expect(contrast(input, token(block, surface)), `--input vs --${surface}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('draws input, textarea, select and outline-button edges with the input token', () => {
    for (const file of ['input/Input.vue', 'textarea/Textarea.vue', 'select/SelectTrigger.vue']) {
      const source = readFileSync(`${root}app/components/ui/${file}`, 'utf8');
      expect(source, file).toContain('border-input');
      expect(source, file).not.toMatch(/dark:border-/);
    }

    const variants = readFileSync(`${root}app/components/ui/button/index.ts`, 'utf8');
    const outline = variants.match(/outline:\s*'([^']+)'/)?.[1];
    expect(outline).toContain('border-input');
    expect(outline).not.toMatch(/dark:border-/);
  });
});
