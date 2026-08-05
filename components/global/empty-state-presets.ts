import SearchIllustration from '@/assets/icons/not-found.svg';
import FavoritesIllustration from '@/assets/icons/heart-outline-big.svg';
import OrdersIllustration from '@/assets/icons/order-tracking.svg';

export const searchEmptyPreset = {
  illustration: SearchIllustration,
  heading: 'No products match your search',
  description: 'Try adjusting your keywords or filters to discover parts in the ECAS catalog.',
  suggestions: [
    'Check spelling and part numbers',
    'Use broader terms such as manufacturer or category',
    'Clear filters to widen the results',
  ],
  primaryLabel: 'Browse categories',
  primaryTo: '/search',
} as const;

export const cartEmptyPreset = {
  illustration: SearchIllustration,
  heading: 'Your cart is empty',
  description: 'Add products from search or product pages to build an order for checkout.',
  primaryLabel: 'Start shopping',
  primaryTo: '/search',
} as const;

export const cartErrorPreset = {
  heading: 'We could not load your cart',
  description: 'Try again before adding items or continuing checkout.',
  primaryLabel: 'Try again',
  variant: 'error' as const,
};

export const ordersEmptyPreset = {
  illustration: OrdersIllustration,
  heading: 'No orders yet',
  description: 'When you place an order through checkout, it will appear here with status and invoice details.',
};

export const favoritesEmptyPreset = {
  illustration: FavoritesIllustration,
  heading: 'No favorites saved',
  description: 'Save products while browsing to quickly find them later in your dashboard.',
  primaryLabel: 'Browse products',
  primaryTo: '/search',
};
