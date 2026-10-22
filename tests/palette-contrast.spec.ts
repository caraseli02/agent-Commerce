import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// WCAG 1.4.3: the hue scales used for text and filled controls reach 4.5:1 (UI audit, theming pass).
const root = fileURLToPath(new URL('../', import.meta.url));
const css = readFileSync(`${root}app/assets/css/main.css`, 'utf8');

type Rgb = [number, number, number];

function hex(value: string): Rgb {
  const parts = value.replace('#', '').match(/../g)!;
  return parts.map((part) => parseInt(part, 16) / 255) as Rgb;
}

function hsl(value: string): Rgb {
  const [h, s, l] = value.split(/\s+/).map((part) => parseFloat(part)) as [number, number, number];
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('\n}', start));
}

function value(source: string, name: string): string {
  const match = source.match(new RegExp(`--${name}:\\s*([^;]+);`));
  expect(match, `--${name}`).not.toBeNull();
  return match![1]!.trim();
}

const theme = block('@theme');
const light = block(':root');
const dark = block('.dark');
const white: Rgb = [1, 1, 1];

describe('palette contrast', () => {
  it.each(['blue', 'green', 'teal', 'orange', 'red', 'rose'].flatMap((hue) => ['500', '600'].map((shade) => `${hue}-${shade}`)))(
    '%s reaches 4.5:1 as text on white and under white text',
    (name) => {
      expect(contrast(hex(value(theme, `color-${name}`)), white)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['blue', 'green', 'teal', 'orange', 'red', 'rose'])('dark %s-500 reaches 4.5:1 on background and card', (hue) => {
    const color = hex(value(dark, `color-${hue}-500`));
    for (const surface of ['background', 'card']) {
      expect(contrast(color, hsl(value(dark, surface))), surface).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    [':root', light],
    ['.dark', dark],
  ])('status fills and error text pass in %s', (_, source) => {
    for (const fill of ['destructive', 'success', 'warning']) {
      expect(contrast(hsl(value(source, fill)), hsl(value(source, `${fill}-foreground`))), fill).toBeGreaterThanOrEqual(4.5);
    }
    for (const surface of ['background', 'card', 'popover', 'muted']) {
      expect(contrast(hsl(value(source, 'destructive-text')), hsl(value(source, surface))), surface).toBeGreaterThanOrEqual(4.5);
    }
  });
});
