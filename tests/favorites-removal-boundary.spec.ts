import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(path), 'utf8');

describe('storefront favorites removal boundary', () => {
  it('keeps the removed favorites implementation and API adapter out of the demo', () => {
    const removedPaths = [
      'app/composables/api/favorites.ts',
      'app/components/layout/favorites-cart-modal/favorites/Index.vue',
      'app/components/layout/favorites-modals/Delete.vue',
      'types/favorites/item.ts',
    ];

    expect(removedPaths.filter((path) => existsSync(resolve(path)))).toEqual([]);
  });

  it('does not expose add-to-favorites actions in catalog or cart surfaces', () => {
    const publicSurfacePaths = [
      'app/components/global/ProductCard.vue',
      'app/components/product/Gallery.vue',
      'app/components/search/SearchItem.vue',
      'app/components/layout/favorites-cart-modal/Index.vue',
      'app/components/layout/header/MainRow.vue',
      'app/components/layout/header/main-menu/MobileSheet.vue',
      'app/components/layout/account-modal/Links.vue',
    ];

    const offenders = publicSurfacePaths.filter((path) => /addToFavourite|Add to favorites|Favorites/.test(source(path)));

    expect(offenders).toEqual([]);
  });

  it('uses the dedicated cart delete dialog instead of the removed favorites modal', () => {
    const orderSummaryItem = source('app/components/order-summary/Table/Item.vue');
    const deleteDialog = source('app/components/cart/CartDeleteDialog.vue');

    expect(orderSummaryItem).toContain("import CartDeleteDialog from '~/components/cart/CartDeleteDialog.vue'");
    expect(orderSummaryItem).toContain('<CartDeleteDialog');
    expect(orderSummaryItem).not.toContain('LayoutFavoritesModalsDelete');
    expect(deleteDialog).toContain('UiDialogTitle');
    expect(deleteDialog).toContain('UiDialogDescription');
    expect(deleteDialog).toContain('resolveCartDeleteProductIds');
    expect(deleteDialog).toContain("emits('removed')");
  });
});
