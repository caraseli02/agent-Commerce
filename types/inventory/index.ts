export type ProductAvailability =
  Readonly<{ productId: string; state: 'available'; available: number }> | Readonly<{ productId: string; state: 'unavailable' }>;

export type ProductAvailabilityResponse = {
  status: 'success';
  data: ProductAvailability[];
};

/** One row of the operator stock view: a catalog product and its Inventory balance, if tracked. */
export type OperatorInventoryRow = Readonly<{ productId: string; sku: string; name: string }> &
  (Readonly<{ state: 'tracked'; onHand: number; effectiveHeld: number; available: number }> | Readonly<{ state: 'untracked' }>);

export type OperatorInventoryResponse = {
  status: 'success';
  data: OperatorInventoryRow[];
};

export type OperatorPermission = 'inventory:read' | 'inventory:write' | 'orders:fulfil' | 'orders:cancel';

export type OperatorMeResponse = {
  status: 'success';
  data: { accountId: string; permissions: OperatorPermission[] };
};
