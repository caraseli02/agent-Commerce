import { describe, expect, it } from 'vitest';

import {
  extractVueTemplate,
  findNativeInteractiveElements,
  grandfatheredLegacyModalFiles,
  inspectModalUiFile,
  isScopedModalUiFile,
} from '../scripts/verify-ui-conventions.mjs';

describe('verify-ui-conventions', () => {
  it('scopes modal filenames and layout modal directories', () => {
    expect(isScopedModalUiFile('app/components/layout/RegionalPreferencesModal.vue')).toBe(true);
    expect(isScopedModalUiFile('app/components/layout/account-modal/Form.vue')).toBe(true);
    expect(isScopedModalUiFile('app/components/layout/header/MainRow.vue')).toBe(false);
    expect(isScopedModalUiFile('app/components/product/Details.vue')).toBe(false);
  });

  it('flags native button and input tags but ignores UiButton and UiInput', () => {
    const template = `
      <UiButton>Save</UiButton>
      <button class="native">Cancel</button>
      <UiInput v-model="value" />
      <input type="text" />
    `;

    const violations = findNativeInteractiveElements(template);

    expect(violations).toHaveLength(2);
    expect(violations.map((violation) => violation.tag)).toEqual(['button', 'input']);
  });

  it('ignores native tags inside HTML comments', () => {
    const template = `
      <!-- <button>legacy</button> -->
      <UiButton>Save</UiButton>
    `;

    expect(findNativeInteractiveElements(template)).toHaveLength(0);
  });

  it('keeps the legacy modal grandfather list empty after migration', () => {
    expect(grandfatheredLegacyModalFiles.size).toBe(0);
  });

  it('suppresses violations for grandfathered modal paths', () => {
    const relativePath = 'app/components/layout/TemporaryGrandfatheredModal.vue';
    const contents = `<template><button>Close</button></template>`;

    grandfatheredLegacyModalFiles.add(relativePath);

    try {
      const result = inspectModalUiFile(relativePath, contents);
      expect(result.grandfathered).toBe(true);
      expect(result.violations).toHaveLength(0);
    } finally {
      grandfatheredLegacyModalFiles.delete(relativePath);
    }

    expect(grandfatheredLegacyModalFiles.size).toBe(0);
  });

  it('fails non-grandfathered modal files that still use native controls', () => {
    const contents = `<template><button>Close</button></template>`;
    const result = inspectModalUiFile('app/components/layout/NewExampleModal.vue', contents);

    expect(result.grandfathered).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.tag).toBe('button');
  });

  it('extracts only the Vue template block', () => {
    const contents = `
<script setup lang="ts">
const label = '<button>not counted</button>';
</script>
<template>
  <button>Counted</button>
</template>
`;

    const template = extractVueTemplate(contents);
    expect(findNativeInteractiveElements(template)).toHaveLength(1);
  });
});
