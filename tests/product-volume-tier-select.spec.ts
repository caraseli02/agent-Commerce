import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

import type { UserInterface } from '~~/types/auth/user-interface';
import type { ProductInterface } from '~~/types/product';
import { parseProductPriceConfiguration } from '../helpers/prices.helper';

const quantityPath = resolve('app/components/product/Quantity.vue');

const tieredProduct = {
  _id: 'prod-tiers',
  stock: 150,
  priceConfiguration: {
    smartLinkId: 'smart-price-tiers',
    configuration: [
      { price: 999.99, quantity: 1 },
      { price: 979.99, quantity: 5 },
      { price: 959.99, quantity: 10 },
    ],
  },
} as ProductInterface;

function volumeRowClickExpression(): string | undefined {
  const { descriptor } = parseSfc(readFileSync(quantityPath, 'utf8'));
  expect(descriptor.template).toBeTruthy();

  const rows: ElementNode[] = [];
  const visit = (node: TemplateChildNode) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    const isVolumeRow = node.props.some(
      (prop) => prop.type === NodeTypes.DIRECTIVE && prop.name === 'for' && prop.exp?.loc.source.includes('bulkQuantities'),
    );
    const hasClick = node.props.some((prop) => prop.type === NodeTypes.DIRECTIVE && prop.name === 'on');
    if (isVolumeRow && hasClick) rows.push(node);
    node.children.forEach(visit);
  };
  baseParse(descriptor.template!.content).children.forEach(visit);

  expect(rows).toHaveLength(1);
  const click = rows[0]!.props.find((prop) => prop.type === NodeTypes.DIRECTIVE && prop.name === 'on');
  return click?.type === NodeTypes.DIRECTIVE && click.exp?.type === NodeTypes.SIMPLE_EXPRESSION ? click.exp.content : undefined;
}

describe('PDP volume-price row selection', () => {
  it('sets the quantity to the clicked tier quantity, not one more', () => {
    expect(volumeRowClickExpression()).toBe('quantity = bulkQuantity[0]');
  });

  it.each([1, 5, 10])('selects the %i+ tier at exactly its threshold', (tierQuantity) => {
    const pricing = parseProductPriceConfiguration(tieredProduct, {} as UserInterface, tierQuantity);

    expect(pricing?.priceConfiguration?.quantity).toBe(tierQuantity);
  });
});
