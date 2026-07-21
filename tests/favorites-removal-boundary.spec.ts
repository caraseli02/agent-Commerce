import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(path), 'utf8');

describe('storefront favorites removal boundary', () => {
  it('keeps the removed favorites implementation and API adapter out of the demo', () => {
    const removedPaths = [
      'composables/api/favorites.ts',
      'components/layout/favorites-cart-modal/favorites/Index.vue',
      'components/layout/favorites-modals/Delete.vue',
      'types/favorites/item.ts',
    ];

    expect(removedPaths.filter((path) => existsSync(resolve(path)))).toEqual([]);
  });

  it('does not expose add-to-favorites actions in catalog or cart surfaces', () => {
    const publicSurfacePaths = [
      'components/global/ProductCard.vue',
      'components/product/Gallery.vue',
      'components/search/SearchItem.vue',
      'components/layout/favorites-cart-modal/Index.vue',
      'components/layout/header/MainRow.vue',
      'components/layout/header/SearchRow.vue',
      'components/layout/header/main-menu/MobileSheet.vue',
      'components/layout/account-modal/Links.vue',
    ];

    const offenders = publicSurfacePaths.filter((path) => /addToFavourite|Add to favorites|Favorites/.test(source(path)));

    expect(offenders).toEqual([]);
  });

  it('uses the dedicated cart delete dialog instead of the removed favorites modal', () => {
    const orderSummaryItem = source('components/order-summary/Table/Item.vue');
    const deleteDialog = source('components/cart/CartDeleteDialog.vue');

    expect(orderSummaryItem).toContain("import CartDeleteDialog from '~/components/cart/CartDeleteDialog.vue'");
    expect(orderSummaryItem).toContain('<CartDeleteDialog v-model="deleteItem" :product-id="item.id"');
    expect(orderSummaryItem).not.toContain('LayoutFavoritesModalsDelete');
    expect(deleteDialog).toContain('products: [props.productId]');
    expect(deleteDialog).toContain("if (removed.status === 'success')");
    expect(deleteDialog).toContain("emits('removed')");
  });
});
