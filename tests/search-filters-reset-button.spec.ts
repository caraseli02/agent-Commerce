import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const filtersPath = resolve('app/components/search/Filters.vue');

function parseElements(): ElementNode[] {
  const { descriptor } = parseSfc(readFileSync(filtersPath, 'utf8'));
  expect(descriptor.template).toBeTruthy();

  const found: ElementNode[] = [];
  const visit = (node: TemplateChildNode) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    found.push(node);
    node.children.forEach(visit);
  };
  baseParse(descriptor.template!.content).children.forEach(visit);
  return found;
}

function textOf(element: ElementNode): string {
  return element.children
    .map((child) => {
      if (child.type === NodeTypes.TEXT) return child.content;
      if (child.type === NodeTypes.ELEMENT) return textOf(child);
      return '';
    })
    .join('')
    .trim();
}

function hasClickHandler(element: ElementNode): boolean {
  return element.props.some(
    (prop) =>
      prop.type === NodeTypes.DIRECTIVE &&
      prop.name === 'on' &&
      prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
      prop.arg.content === 'click',
  );
}

function descendants(element: ElementNode): ElementNode[] {
  return element.children.flatMap((child) => (child.type === NodeTypes.ELEMENT ? [child, ...descendants(child)] : []));
}

describe('search filters Reset Filters button', () => {
  const resetButton = parseElements().find((element) => element.tag === 'UiButton' && textOf(element) === 'Reset Filters');

  it('binds the reset handler to the button so keyboard and padding activation reset filters', () => {
    expect(resetButton).toBeTruthy();
    expect(hasClickHandler(resetButton!)).toBe(true);
  });

  it('keeps no click handler on the button label or icon', () => {
    expect(descendants(resetButton!).filter(hasClickHandler)).toEqual([]);
  });
});
