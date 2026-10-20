// @ts-check
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plugin as shadcn } from '@shadcn/lint';
import withNuxt from './.nuxt/eslint.config.mjs';

const root = dirname(fileURLToPath(import.meta.url));

// @shadcn/lint matches a tag without an import by its export name (`Button`),
// but Nuxt auto-imports our primitives with the `Ui` prefix (`<UiButton>`).
// Re-export each one under its Nuxt name, read from Nuxt's own component
// registry, so the linter resolves `<UiButton>` to the Button barrel and its
// variants. Generated on every lint run, so it cannot drift from Nuxt.
// See docs/design-system-lint.md.
function writeNuxtUiBridge() {
  const registry = readFileSync(resolve(root, '.nuxt/components.d.ts'), 'utf8');
  const lines = [];
  for (const [, name, source, exported] of registry.matchAll(
    /^export const (Ui\w+): typeof import\("([^"]+\/components\/ui\/[^"]+)"\)\['(\w+)'\]/gm,
  )) {
    const from = JSON.stringify(resolve(root, '.nuxt', source));
    lines.push(`export { ${exported} as ${name} } from ${from};`);
  }
  const dir = resolve(root, 'node_modules/.cache/shadcn-lint-nuxt-ui');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.ts'), `${lines.join('\n')}\n`);
  return dir;
}

// `pnpm lint:design` reports the token rules that still have legacy debt
// (#733 audit). They stay out of `pnpm lint` until that debt is resolved.
const designAudit = process.env.DESIGN_LINT_AUDIT === '1';

export default withNuxt(
  {
    rules: {
      // Existing code relies on assignments this newer ESLint rule reports.
      // Keep the pre-upgrade lint baseline; cleanup belongs in its own issue.
      'no-useless-assignment': 'off',
      // Prettier 3 consistently emits self-closing Vue void elements. Keep the
      // formatter and lint output compatible without changing rendered markup.
      'vue/html-self-closing': 'off',
    },
  },
  {
    name: 'design-system/shadcn',
    files: ['app/**/*.vue'],
    plugins: { shadcn },
    settings: {
      shadcn: {
        ui: ['@/components/ui', writeNuxtUiBridge()],
        note: 'See docs/design-system-lint.md for allowed classes and exceptions.',
      },
    },
    rules: {
      // Consumers may place a primitive (margin, width, position, display);
      // appearance comes from its variants and sizes.
      'shadcn/no-restyle': [
        'error',
        {
          allow: ['layout'],
          contracts: [
            // A skeleton mirrors the shape of the content it stands in for.
            { pattern: '^UiSkeleton$', allow: ['layout', 'shape'] },
            // Overlay panels hold arbitrary content and set its padding.
            { pattern: '^Ui(Dialog|Sheet|Popover)Content$', allow: ['layout', 'spacing'] },
          ],
        },
      ],
      ...(designAudit && {
        'shadcn/no-arbitrary-values': ['warn', { allow: ['layout'] }],
        'shadcn/no-unknown-classes': 'warn',
      }),
    },
  },
  {
    // Primitives own their styling.
    name: 'design-system/shadcn-primitives',
    files: ['app/components/ui/**'],
    rules: {
      'shadcn/no-restyle': 'off',
      'shadcn/no-arbitrary-values': 'off',
    },
  },
);
