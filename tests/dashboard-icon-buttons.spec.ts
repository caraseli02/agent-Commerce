import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode, type TemplateChildNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

// The M5 dashboard slice names its icon-only buttons (#642). The Header notification panel is
// never opened (Notifications owns its sheet), so runtime parity cannot see those buttons.
const files = [
  'Aside.vue',
  'Header.vue',
  'new-customers/Item.vue',
  'customers/CustomerInformation.vue',
  'customers/DefaultShippingAddress.vue',
  'client/Info.vue',
].map((name) => `app/components/dashboard/${name}`);

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

describe('dashboard icon-only buttons', () => {
  it.each(files)('names every icon-only UiButton in %s', (filePath) => {
    const iconOnly = collectElements(parseTemplate(filePath), 'UiButton').filter((button) => !button.children.some(hasText));

    expect(iconOnly.length).toBeGreaterThan(0);
    for (const button of iconOnly) {
      expect(findProp(button, 'aria-label'), `line ${button.loc.start.line}`).toBeTruthy();
    }
  });

  it('names the orders Download All control, whose text hides below md', () => {
    const [download] = collectElements(parseTemplate('app/pages/dashboard/orders/index.vue'), 'UiButton');

    expect(findProp(download!, 'aria-label')).toBeTruthy();
  });

  it('names the icon-only client dashboard tab', () => {
    const [tab] = collectElements(parseTemplate('app/components/dashboard/client/TabBar.vue'), 'UiButton');

    expect(findProp(tab!, 'aria-label')).toBeTruthy();
  });
});
