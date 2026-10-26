import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const dialogPath = resolve('app/components/product/AskDialog.vue');
const pagePath = resolve('app/pages/product/[slug].vue');

function parseElements(path: string): ElementNode[] {
  const { descriptor } = parseSfc(readFileSync(path, 'utf8'));
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

function directive(element: ElementNode, name: string, arg?: string) {
  return element.props.find(
    (prop) =>
      prop.type === NodeTypes.DIRECTIVE &&
      prop.name === name &&
      (arg === undefined || (prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION && prop.arg.content === arg)),
  );
}

function expressionOf(prop: ReturnType<typeof directive>): string | undefined {
  return prop?.type === NodeTypes.DIRECTIVE && prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION ? prop.exp.content : undefined;
}

describe('Ask about the product dialog part number', () => {
  const dialogSource = readFileSync(dialogPath, 'utf8');
  const partNumberHeading = parseElements(dialogPath).find(
    (element) => element.tag === 'h4' && JSON.stringify(element.children).includes('Part No'),
  );

  it('keeps no hardcoded part number in the dialog', () => {
    expect(dialogSource).not.toContain('XOEIJLSCDA');
  });

  it('renders the partNumber prop and omits the line when it is empty', () => {
    expect(partNumberHeading).toBeTruthy();
    expect(expressionOf(directive(partNumberHeading!, 'if'))).toBe('props.partNumber');
    expect(JSON.stringify(partNumberHeading!.children)).toContain('props.partNumber');
  });

  it('passes the viewed product manufacturer part number from the product page', () => {
    const askDialog = parseElements(pagePath).find((element) => element.tag === 'ProductAskDialog');

    expect(askDialog).toBeTruthy();
    expect(expressionOf(directive(askDialog!, 'bind', 'part-number'))).toBe('product.manufacturerCode');
  });
});
