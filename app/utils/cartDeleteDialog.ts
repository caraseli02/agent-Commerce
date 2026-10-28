export type CartDeleteDialogCopyInput = {
  productIds?: string[];
  productId?: string;
  title?: string;
  description?: string;
};

export function resolveCartDeleteProductIds(input: Pick<CartDeleteDialogCopyInput, 'productIds' | 'productId'>): string[] {
  if (input.productIds?.length) {
    return input.productIds;
  }

  return input.productId ? [input.productId] : [];
}

export function resolveCartDeleteTitle(input: CartDeleteDialogCopyInput): string {
  if (input.title) {
    return input.title;
  }

  const count = resolveCartDeleteProductIds(input).length;
  return count > 1 ? 'Delete Items' : 'Delete Item';
}

export function resolveCartDeleteDescription(input: CartDeleteDialogCopyInput): string {
  if (input.description) {
    return input.description;
  }

  const count = resolveCartDeleteProductIds(input).length;

  if (count > 1) {
    return `Delete ${count} selected items?`;
  }

  return 'Delete selected item?';
}

export type CartDeleteOutcome = 'removed' | 'cancelled' | 'failed';

/**
 * Runs the confirmed delete. `null` means the shopper was sent to sign in, so
 * nothing failed; any other non-success response or a rejection does.
 */
export async function runCartDelete(remove: () => Promise<{ status?: string } | null>): Promise<CartDeleteOutcome> {
  try {
    const response = await remove();
    if (response === null) return 'cancelled';
    return response?.status === 'success' ? 'removed' : 'failed';
  } catch {
    return 'failed';
  }
}
