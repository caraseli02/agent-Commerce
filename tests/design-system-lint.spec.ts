import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

// Runs the repository's real eslint.config.mjs (the same config `pnpm lint`
// uses) against representative templates. See docs/design-system-lint.md.
const root = fileURLToPath(new URL('../', import.meta.url));
const consumer = 'app/components/__design-system-lint-fixture__.vue';

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: root });
});

async function restyleFindings(template: string, filePath = consumer, script = '') {
  const [result] = await eslint.lintText(`${script}<template>\n${template}\n</template>\n`, { filePath });
  expect(result?.messages.filter((message) => message.fatal)).toEqual([]);
  return (result?.messages ?? []).filter((message) => message.ruleId?.startsWith('shadcn/'));
}

describe('design-system lint (@shadcn/lint)', () => {
  it('accepts supported variants, sizes and layout classes on an auto-imported UiButton', async () => {
    const findings = await restyleFindings(`
  <UiButton variant="outline" size="sm" class="mt-4 w-full">Save</UiButton>
  <UiButton variant="destructive" size="lg" class="hidden md:flex">Delete</UiButton>`);

    expect(findings).toEqual([]);
  });

  it('reports an appearance override on an auto-imported UiButton with actionable guidance', async () => {
    const findings = await restyleFindings('  <UiButton class="mt-4 bg-red-500 px-10 rounded-full">Save</UiButton>');

    expect(findings.map((finding) => [finding.ruleId, finding.severity])).toEqual([
      ['shadcn/no-restyle', 2],
      ['shadcn/no-restyle', 2],
      ['shadcn/no-restyle', 2],
    ]);
    const text = findings.map((finding) => finding.message).join('\n');
    expect(text).toContain('"bg-red-500" is not allowed on <UiButton>: <UiButton> owns its color');
    expect(text).toContain('"px-10" is not allowed on <UiButton>: <UiButton> owns its spacing');
    expect(text).toContain('"rounded-full" is not allowed on <UiButton>: <UiButton> owns its shape');
    expect(text).toContain('docs/design-system-lint.md');
  });

  it('recognizes the kebab-case auto-import and :class bindings', async () => {
    const findings = await restyleFindings(`
  <ui-button class="p-4">Save</ui-button>
  <UiButton :class="{ 'text-red-500': true }">Save</UiButton>`);

    expect(findings.map((finding) => finding.message.split(':')[0])).toEqual([
      '"p-4" is not allowed on <UiButton>',
      '"text-red-500" is not allowed on <UiButton>',
    ]);
  });

  it('lists the real variants and sizes for an explicitly imported Button', async () => {
    const findings = await restyleFindings(
      '  <Button class="px-10 bg-pink-500">Save</Button>',
      consumer,
      '<script setup lang="ts">\nimport { Button } from \'@/components/ui/button\';\n</script>\n',
    );

    const text = findings.map((finding) => finding.message).join('\n');
    expect(text).toContain('Use a size (default, xs, sm, lg, icon, card, card-compact, row, flush, addon)');
    expect(text).toContain(
      'Use a variant: default, cart, success, destructive, outline, secondary, ghost, link, option, option-selected, option-dashed, option-dashed-selected, bare, input-addon',
    );
  });

  it('applies the documented contracts for skeletons and overlay panels', async () => {
    const allowed = await restyleFindings(`
  <UiSkeleton class="h-4 w-24 rounded-full" />
  <UiDialogContent class="max-w-lg p-0">Body</UiDialogContent>`);
    const reported = await restyleFindings(`
  <UiSkeleton class="bg-red-500" />
  <UiDialogContent class="bg-red-500 p-0">Body</UiDialogContent>`);

    expect(allowed).toEqual([]);
    expect(reported.map((finding) => finding.message.split(':')[0])).toEqual([
      '"bg-red-500" is not allowed on <UiSkeleton>',
      '"bg-red-500" is not allowed on <UiDialogContent>',
    ]);
  });

  it('leaves primitive internals and plain elements to their owners', async () => {
    const internals = await restyleFindings(
      '  <UiButton class="bg-red-500 px-10">Save</UiButton>',
      'app/components/ui/button/__design-system-lint-fixture__.vue',
    );
    const plain = await restyleFindings('  <div class="p-[13px] bg-[#F2F2F2]">Legacy</div>');

    expect(internals).toEqual([]);
    expect(plain).toEqual([]);
  });
});
