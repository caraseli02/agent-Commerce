export type ProductAvailability =
  Readonly<{ productId: string; state: 'available'; available: number }> | Readonly<{ productId: string; state: 'unavailable' }>;

export type ProductAvailabilityResponse = {
  status: 'success';
  data: ProductAvailability[];
};
