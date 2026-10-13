import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode, type TemplateChildNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

// Index.vue and Large.vue have no reachable consumer, so runtime parity cannot see their
// icon-only buttons; this checks their accessible names statically (#641).
const files = ['Index.vue', 'Large.vue'].map((name) => `app/components/layout/header/main-menu/${name}`);

function parseTemplate(filePath: string): RootNode {
  const { descriptor } = parseSfc(readFileSync(resolve(filePath), 'utf8'));
  expect(descriptor.template).toBeTruthy();
  return baseParse(descriptor.template!.content);
}

function collectElements(root: RootNode, tag: string): ElementNode[] {
  const found: ElementNode[] = [];
  const visit = (node: TemplateChildNode) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    if (node.tag === tag) found.push(node);
    node.children.forEach(visit);
  };
  root.children.forEach(visit);
  return found;
}

function hasText(node: TemplateChildNode): boolean {
  if (node.type === NodeTypes.TEXT) return node.content.trim().length > 0;
  if (node.type === NodeTypes.INTERPOLATION) return true;
  if (node.type === NodeTypes.ELEMENT) return node.children.some(hasText);
  return false;
}

function findProp(element: ElementNode, name: string) {
  return element.props.find(
    (prop) =>
      (prop.type === NodeTypes.ATTRIBUTE && prop.name === name) ||
      (prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'bind' &&
        prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
        prop.arg.content === name),
  );
}

describe('header main menu icon-only buttons', () => {
  it.each(files)('names every icon-only UiButton in %s', (filePath) => {
    const iconOnly = collectElements(parseTemplate(filePath), 'UiButton').filter((button) => !button.children.some(hasText));

    expect(iconOnly.length).toBeGreaterThan(0);
    for (const button of iconOnly) {
      expect(findProp(button, 'aria-label'), `line ${button.loc.start.line}`).toBeTruthy();
    }
  });

  it('exposes the banner toggler state', () => {
    const toggler = collectElements(parseTemplate(files[1]!), 'UiButton').find((button) =>
      button.props.some(
        (prop) => prop.type === NodeTypes.DIRECTIVE && prop.exp?.loc.source.includes('isBannerExpanded = !isBannerExpanded'),
      ),
    );

    expect(toggler).toBeTruthy();
    expect(findProp(toggler!, 'aria-expanded')).toBeTruthy();
  });
});
