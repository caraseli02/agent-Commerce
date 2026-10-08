import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const itemPath = resolve('components/order-summary/Table/Item.vue');
const itemDropdownPath = resolve('components/order-summary/Table/ItemDropdown.vue');

function parseTemplate(filePath: string): RootNode {
  const { descriptor } = parseSfc(readFileSync(filePath, 'utf8'));
  expect(descriptor.template).toBeTruthy();
  return baseParse(descriptor.template!.content);
}

function elementChildren(children: unknown[]): ElementNode[] {
  return (children as { type: number }[]).filter((node) => node.type === NodeTypes.ELEMENT) as ElementNode[];
}

function collectElements(node: { children: unknown[] }, tag: string): ElementNode[] {
  const found: ElementNode[] = [];
  const visit = (child: ElementNode) => {
    if (child.tag === tag) found.push(child);
    elementChildren(child.children).forEach(visit);
  };
  elementChildren(node.children).forEach(visit);
  return found;
}

describe('order summary item dropdown template shape', () => {
  it('has exactly one root element, a div, so Transition can animate it', () => {
    const roots = elementChildren(parseTemplate(itemDropdownPath).children);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.tag).toBe('div');
  });

  it('keeps the delete dialog inside the single root element', () => {
    const root = elementChildren(parseTemplate(itemDropdownPath).children)[0]!;
    expect(collectElements(root, 'CartDeleteDialog')).toHaveLength(1);
  });

  it('wraps a single v-if dropdown with a static item class in the expand Transition', () => {
    const [wrapper] = collectElements(parseTemplate(itemPath), 'Transition');
    expect(wrapper).toBeTruthy();
    const nameProp = wrapper!.props.find((p) => p.type === NodeTypes.ATTRIBUTE && p.name === 'name');
    expect(nameProp && 'value' in nameProp ? nameProp.value?.content : undefined).toBe('expand');

    const children = elementChildren(wrapper!.children);
    expect(children).toHaveLength(1);
    const child = children[0]!;
    expect(child.tag).toBe('OrderSummaryTableItemDropdown');
    expect(child.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'if')).toBe(true);
    const cls = child.props.find((p) => p.type === NodeTypes.ATTRIBUTE && p.name === 'class');
    expect(cls && 'value' in cls ? cls.value?.content : undefined).toBe('item');
  });
});
