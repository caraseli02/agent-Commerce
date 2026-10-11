import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  checkUiConventions,
  compareToBaseline,
  computeUpdatedBaseline,
  countNativeElements,
  findNativeElements,
  isScannedVueFile,
  serializeBaseline,
  validateBaseline,
} from '../scripts/verify-ui-conventions.mjs';

const sfc = (template: string, script = '') => `${script}<template>\n${template}\n</template>\n`;

const tagsOf = (contents: string) => findNativeElements('app/components/Example.vue', contents).elements.map((element) => element.tag);

describe('verify-ui-conventions: scanning', () => {
  it('scans every .vue outside app/components/ui/', () => {
    expect(isScannedVueFile('app/components/product/Details.vue')).toBe(true);
    expect(isScannedVueFile('app/pages/index.vue')).toBe(true);
    expect(isScannedVueFile('app/error.vue')).toBe(true);
    expect(isScannedVueFile('app/components/ui/button/Button.vue')).toBe(false);
    expect(isScannedVueFile('scripts/verify-ui-conventions.mjs')).toBe(false);
  });

  it('counts native elements after a nested <template v-if> (Range.vue shape)', () => {
    const contents = `<script setup lang="ts">
const range = ref([0, 0]);
</script>

<template>
  <UiPopover>
    <UiButton variant="outline">
      <template v-if="selectedValues">
        <UiBadge>Min</UiBadge>
      </template>
    </UiButton>
    <UiPopoverContent>
      <label>
        <input v-model.number="range[0]" type="number" />
      </label>
      <label>
        <input v-model.number="range[1]" type="number" />
      </label>
    </UiPopoverContent>
  </UiPopover>
</template>
`;

    const { elements, errors } = findNativeElements('app/components/dataTable/filter/Range.vue', contents);

    expect(errors).toEqual([]);
    expect(elements).toEqual([
      { tag: 'label', line: 13 },
      { tag: 'input', line: 14 },
      { tag: 'label', line: 16 },
      { tag: 'input', line: 17 },
    ]);
  });

  it('detects all six native tags and ignores components with similar names', () => {
    const contents = sfc(`
  <div>
    <button type="button">A</button>
    <input type="text" />
    <label for="x">L</label>
    <textarea>notes</textarea>
    <table><tbody><tr><td>1</td></tr></tbody></table>
    <select><option>1</option></select>
    <UiButton>Save</UiButton>
    <Button>Save</Button>
    <UiInput />
    <UiLabel>L</UiLabel>
    <UiTextarea />
    <UiTable />
    <UiSelect />
    <ButtonGroup />
  </div>`);

    expect(tagsOf(contents)).toEqual(['button', 'input', 'label', 'textarea', 'table', 'select']);
  });

  it('ignores native tags inside comments, script blocks, attribute strings and interpolations', () => {
    const contents = sfc(
      `
  <div :title="'<button>'" data-html="<input>">
    <!-- <button>legacy</button> -->
    {{ '<label>' }}
    <UiButton>Save</UiButton>
  </div>`,
      `<script setup lang="ts">
const markup = '<button>not counted</button><input />';
</script>
`,
    );

    expect(tagsOf(contents)).toEqual([]);
  });

  it('accepts a native element preceded by a ui-native comment with a reason', () => {
    const contents = sfc(`
  <div>
    <!-- ui-native: hidden file input driven by .click() -->
    <input ref="file" type="file" class="hidden" />
    <button type="button">Counted</button>
  </div>`);

    const { elements, exceptions, errors } = findNativeElements('app/components/icon/Upload.vue', contents);

    expect(errors).toEqual([]);
    expect(elements).toEqual([{ tag: 'button', line: 6 }]);
    expect(exceptions).toEqual([{ tag: 'input', line: 5, reason: 'hidden file input driven by .click()' }]);
  });

  it('keeps comments when Vue loads its production compiler build', () => {
    // The production compiler drops comments by default; the scan must still see ui-native exceptions.
    const script = `
      import { findNativeElements } from './scripts/verify-ui-conventions.mjs';
      const { exceptions } = findNativeElements('app/X.vue', '<template><!-- ui-native: reason --><button>x</button></template>');
      process.stdout.write(String(exceptions.length));
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production' },
    });

    expect(output).toBe('1');
  });

  it('only exempts the element directly after the comment', () => {
    const contents = sfc(`
  <div>
    <!-- ui-native: reason -->
    <span />
    <button>Still counted</button>
  </div>`);

    expect(tagsOf(contents)).toEqual(['button']);
  });

  it('reports an empty ui-native reason as an error with its line and still counts the element', () => {
    const contents = sfc(`
  <div>
    <!-- ui-native:   -->
    <button>Close</button>
  </div>`);

    const { elements, exceptions, errors } = findNativeElements('app/components/Example.vue', contents);

    expect(exceptions).toEqual([]);
    expect(elements).toEqual([{ tag: 'button', line: 5 }]);
    expect(errors).toEqual([expect.objectContaining({ line: 4, message: expect.stringContaining('no reason') })]);

    const result = checkUiConventions({ 'app/components/Example.vue': { elements: [], exceptions: [], errors } }, {});
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/^app\/components\/Example\.vue:4 /);
  });
});

describe('verify-ui-conventions: baseline ratchet', () => {
  const button = (line: number) => ({ tag: 'button', line });
  const scan = (...elements: { tag: string; line: number }[]) => ({ elements, exceptions: [], errors: [] });

  it('passes when counts match the baseline', () => {
    const result = checkUiConventions({ 'app/A.vue': scan(button(3), button(9)), 'app/B.vue': scan() }, { 'app/A.vue': { button: 2 } });

    expect(result.ok).toBe(true);
    expect(result.counts).toEqual({ 'app/A.vue': { button: 2 } });
  });

  it('fails when a baselined file grows and names every element as path:line', () => {
    const result = checkUiConventions(
      { 'app/A.vue': scan(button(3), button(9), { tag: 'input', line: 12 }) },
      { 'app/A.vue': { button: 1, input: 1 } },
    );

    expect(result.ok).toBe(false);
    expect(result.growth).toEqual([
      'app/A.vue: 2 native <button> (baseline allows 1)',
      '  - app/A.vue:3 <button>',
      '  - app/A.vue:9 <button>',
    ]);
  });

  it('fails when a file outside the baseline has a native element', () => {
    const result = checkUiConventions({ 'app/New.vue': scan(button(7)) }, {});

    expect(result.ok).toBe(false);
    expect(result.growth).toEqual(['app/New.vue: 1 native <button> (file is not in the baseline)', '  - app/New.vue:7 <button>']);
  });

  it('fails when the baseline is stale', () => {
    const result = checkUiConventions({ 'app/A.vue': scan(button(3)) }, { 'app/A.vue': { button: 2 }, 'app/Gone.vue': { label: 1 } });

    expect(result.ok).toBe(false);
    expect(result.growth).toEqual([]);
    expect(result.stale).toEqual([
      'app/A.vue: baseline allows 2 <button>, found 1',
      'app/Gone.vue: baseline allows 1 <label>, found 0 (file has no native elements or no longer exists)',
    ]);
  });

  it('does not count accepted exceptions', () => {
    const result = checkUiConventions(
      { 'app/A.vue': { elements: [], exceptions: [{ tag: 'input', line: 4, reason: 'file input' }], errors: [] } },
      {},
    );

    expect(result.ok).toBe(true);
    expect(result.exceptions).toEqual([{ path: 'app/A.vue', tag: 'input', line: 4, reason: 'file input' }]);
  });

  it('compares per tag', () => {
    expect(compareToBaseline({ 'app/A.vue': { input: 1 } }, { 'app/A.vue': { button: 1 } })).toEqual({
      growth: [{ path: 'app/A.vue', tag: 'input', allowed: 0, actual: 1 }],
      stale: [{ path: 'app/A.vue', tag: 'button', allowed: 1, actual: 0 }],
    });
  });

  it('--update lowers counts and drops files that no longer have native elements', () => {
    const updated = computeUpdatedBaseline(
      { 'app/A.vue': { button: 1 } },
      { 'app/A.vue': { button: 3, label: 1 }, 'app/Gone.vue': { input: 2 } },
    );

    expect(updated).toEqual({ ok: true, baseline: { 'app/A.vue': { button: 1 } } });
  });

  it('--update refuses to raise a count', () => {
    const updated = computeUpdatedBaseline({ 'app/A.vue': { button: 4 } }, { 'app/A.vue': { button: 3 } });

    expect(updated).toEqual({ ok: false, increases: [{ path: 'app/A.vue', tag: 'button', allowed: 3, actual: 4 }] });
  });

  it('--update refuses to add a new file', () => {
    const updated = computeUpdatedBaseline({ 'app/A.vue': { button: 1 }, 'app/New.vue': { label: 1 } }, { 'app/A.vue': { button: 1 } });

    expect(updated).toEqual({ ok: false, increases: [{ path: 'app/New.vue', tag: 'label', allowed: 0, actual: 1 }] });
  });

  it('serializes a sorted baseline without zero counts', () => {
    const counts = countNativeElements({ 'app/b.vue': [button(1)], 'app/a.vue': [{ tag: 'label', line: 2 }, button(1)], 'app/c.vue': [] });

    expect(serializeBaseline(counts)).toBe(
      `${JSON.stringify({ 'app/a.vue': { button: 1, label: 1 }, 'app/b.vue': { button: 1 } }, null, 2)}\n`,
    );
  });

  it('rejects malformed baselines', () => {
    expect(() => validateBaseline({ 'app/A.vue': { div: 1 } })).toThrow(/unknown tag "div"/);
    expect(() => validateBaseline({ 'app/A.vue': { button: 0 } })).toThrow(/positive integer/);
    expect(() => validateBaseline([])).toThrow(/JSON object/);
  });

  it('keeps the committed baseline valid and includes the Range.vue inputs after its nested template', () => {
    const baseline = validateBaseline(JSON.parse(readFileSync('scripts/ui-conventions-baseline.json', 'utf8')));

    expect(baseline['app/components/dataTable/filter/Range.vue']).toEqual({ input: 2, label: 2 });
    expect(Object.keys(baseline).some((file) => file.startsWith('app/components/ui/'))).toBe(false);
  });
});
