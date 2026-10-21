import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode, type TemplateChildNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it, vi } from 'vitest';

import { buttonVariants } from '~/components/ui/button';
import { cn } from '~/lib/utils';

// The barrel re-exports Button.vue, which vitest cannot compile; only the variants are under test.
vi.mock('~/components/ui/button/Button.vue', () => ({ default: {} }));

// tailwind-merge drops the default variant's light `bg-*` when a caller passes its own,
// but keeps the `dark:` utilities, so the caller's colour is lost in dark mode (#761).
const files = [
  'app/components/dashboard/DeactivateUserModal.vue',
  'app/components/dashboard/client/ActiveOrders.vue',
  'app/components/dataTable/HeadControls.vue',
  'app/components/dataTable/ViewOptions.vue',
];

function parseTemplate(filePath: string): RootNode {
  const { descriptor } = parseSfc(readFileSync(resolve(filePath), 'utf8'));
  expect(descriptor.template).toBeTruthy();
  return baseParse(descriptor.template!.content);
}

function collectButtons(root: RootNode): ElementNode[] {
  const found: ElementNode[] = [];
  const visit = (node: TemplateChildNode) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    if (node.tag === 'UiButton') found.push(node);
    node.children.forEach(visit);
  };
  root.children.forEach(visit);
  return found;
}

function staticAttr(node: ElementNode, name: string): string | undefined {
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.name === name) return prop.value?.content ?? '';
  }
  return undefined;
}

describe('Button variants', () => {
  it.each(['success', 'destructive', 'secondary'] as const)('%s keeps its own background in dark mode', (variant) => {
    const classes = cn(buttonVariants({ variant })).split(' ');
    expect(classes).not.toContain('dark:bg-muted');
    expect(classes.some((name) => /^bg-/.test(name))).toBe(true);
  });

  it('success pairs white text with a background dark enough for WCAG AA', () => {
    expect(buttonVariants({ variant: 'success' })).toContain('bg-green-800');
    expect(buttonVariants({ variant: 'success' })).toContain('text-white');
  });
});

describe('Default-variant buttons do not override their background', () => {
  it.each(files)('%s', (filePath) => {
    const offenders = collectButtons(parseTemplate(filePath))
      .filter((node) => (staticAttr(node, 'variant') ?? 'default') === 'default')
      .map((node) => staticAttr(node, 'class') ?? '')
      .filter((classes) => classes.split(/\s+/).some((name) => /^(hover:)?bg-/.test(name)));

    expect(offenders).toEqual([]);
  });
});
