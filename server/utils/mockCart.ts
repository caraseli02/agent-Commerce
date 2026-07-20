import type { CartInterface, CartProductsInterface } from '~/types/cart';
import { getCookie, setCookie, type H3Event } from 'h3';
import { calculateCartLinePricing, clampCartQuantity } from '~/helpers/cart-pricing';
import { mockProducts } from '~/server/utils/mockProducts';
import { parseMockUserIdFromToken } from '~/server/utils/mockUsers';
import type { DiscountInterface } from '~/types/auth/account-settings';

const CART_TTL_MS = 60 * 60 * 1000;
const MAX_CARTS = 250;
const GUEST_CART_USER_ID = 'guest-user-session';
const GUEST_SESSION_COOKIE = 'guest-session-id';

type StoredCart = {
  cart: CartInterface;
  updatedAt: number;
};

const cartsByUserId = new Map<string, StoredCart>();

const nowIso = () => new Date().toISOString();
const nowMs = () => Date.now();

const normalizeGuestSessionId = (guestSessionId?: string | null) => {
  const normalized = String(guestSessionId || '').trim();

  if (!normalized) {
    return '';
  }

  return normalized.startsWith(`${GUEST_CART_USER_ID}-`) ? normalized.slice(GUEST_CART_USER_ID.length + 1) : normalized;
};

const buildGuestCartUserId = (guestSessionId?: string | null) => {
  const normalized = normalizeGuestSessionId(guestSessionId);
  return normalized ? `${GUEST_CART_USER_ID}-${normalized}` : '';
};

const buildDefaultDiscount = (): DiscountInterface => ({
  value: 0,
  startDate: nowIso(),
  endDate: nowIso(),
});

const resolveMockProduct = (idOrCode: string) => {
  const normalized = String(idOrCode || '').trim();
  if (!normalized) {
    return null;
  }

  return mockProducts.find((product) => product._id === normalized || product.code === normalized) || null;
};

const normalizeIncomingProductId = (idOrCode?: string | null) => {
  const normalized = String(idOrCode || '').trim();
  if (!normalized) {
    return { id: '', entity: null };
  }

  const entity = resolveMockProduct(normalized);
  return { id: entity?._id || normalized, entity };
};

type ProductPriceHistoryEntry = {
  active?: boolean;
  price?: number;
};

type ProductEntityLike = {
  stock?: number;
  priceConfiguration?: {
    configuration?: Array<{ price?: number; quantity?: number }>;
  };
  priceHistory?: ProductPriceHistoryEntry[];
};

const calculatePricing = (productEntity: ProductEntityLike | null | undefined, stock = 0, backorderStock = 0) => {
  return calculateCartLinePricing(productEntity, stock, backorderStock);
};

const normalizeCartProduct = (input: Partial<CartProductsInterface>, existing?: CartProductsInterface, mode: 'add' | 'set' = 'add') => {
  const normalizedIncoming = normalizeIncomingProductId(String(input.id || ''));
  const resolvedEntity = normalizedIncoming.entity;

  const previous = existing || ({} as CartProductsInterface);
  const previousStock = Number(previous.stock || 0);
  const previousBackorder = Number(previous.backorder_stock || 0);

  const incomingStock = Number(input.stock ?? 0);
  const incomingBackorder = Number(input.backorder_stock ?? 0);

  let stock = input.updateOnlyBackorderStock ? previousStock : mode === 'add' ? previousStock + incomingStock : incomingStock || 0;

  const backorder_stock = input.updateOnlyAvailableStock
    ? previousBackorder
    : mode === 'add'
    ? previousBackorder + incomingBackorder
    : incomingBackorder || 0;

  const productEntity = resolvedEntity || previous.productEntity;

  if (!input.updateOnlyBackorderStock && productEntity) {
    const clampResult = clampCartQuantity(productEntity, stock, {
      existingBackorderStock: backorder_stock,
    });
    stock = clampResult.stock;
  }

  const pricing = calculatePricing(productEntity, stock, backorder_stock);

  return {
    id: normalizedIncoming.id || String(previous.id || ''),
    isFolder: Boolean(input.isFolder ?? previous.isFolder ?? false),
    stock,
    backorder_stock,
    updateOnlyAvailableStock: input.updateOnlyAvailableStock ?? previous.updateOnlyAvailableStock,
    updateOnlyBackorderStock: input.updateOnlyBackorderStock ?? previous.updateOnlyBackorderStock,
    initialUnitPrice: pricing.initialUnitPrice,
    unitPriceAfterDiscounts: pricing.unitPriceAfterDiscounts,
    subtotal: pricing.subtotal,
    total: pricing.total,
    discount: (previous.discount as DiscountInterface) || buildDefaultDiscount(),
    productEntity,
    liked: previous.liked ?? false,
    selected: previous.selected ?? false,
  } as CartProductsInterface;
};

const purgeExpiredCarts = () => {
  const cutoff = nowMs() - CART_TTL_MS;
  for (const [userId, stored] of cartsByUserId.entries()) {
    if (stored.updatedAt < cutoff) {
      cartsByUserId.delete(userId);
    }
  }

  if (cartsByUserId.size <= MAX_CARTS) {
    return;
  }

  const byOldest = [...cartsByUserId.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const overflow = byOldest.length - MAX_CARTS;
  for (let i = 0; i < overflow; i++) {
    cartsByUserId.delete(byOldest[i][0]);
  }
};

export const getMockCartForUser = (userId: string) => {
  purgeExpiredCarts();

  const existing = cartsByUserId.get(userId);
  if (existing?.cart) {
    existing.cart.products = Array.isArray(existing.cart.products) ? existing.cart.products : [];
    existing.updatedAt = nowMs();
    return existing.cart;
  }

  const defaultProduct = resolveMockProduct('prod-1');
  const starterProducts: CartProductsInterface[] = defaultProduct
    ? [
        normalizeCartProduct(
          {
            id: defaultProduct._id,
            stock: 1,
            isFolder: false,
          },
          undefined,
          'set'
        ),
      ]
    : [];

  const cart: CartInterface = {
    _id: `mock-cart-${userId}`,
    userId,
    products: starterProducts,
    startDate: nowIso(),
    endDate: nowIso(),
  };

  cartsByUserId.set(userId, { cart, updatedAt: nowMs() });
  return cart;
};

export const findMockCartById = (cartId?: string | null) => {
  const normalizedId = String(cartId || '').trim();

  if (!normalizedId) {
    return null;
  }

  for (const stored of cartsByUserId.values()) {
    if (stored.cart?._id === normalizedId) {
      stored.updatedAt = nowMs();
      return stored.cart;
    }
  }

  return null;
};

export const requireMockCartUserId = (event: H3Event, authorizationHeader?: string | null) => {
  const userId = parseMockUserIdFromToken(authorizationHeader);

  if (userId) {
    return userId;
  }

  const existingGuestSessionId = getCookie(event, GUEST_SESSION_COOKIE);
  if (existingGuestSessionId) {
    return buildGuestCartUserId(existingGuestSessionId) || GUEST_CART_USER_ID;
  }

  const guestSessionId = crypto.randomUUID();
  setCookie(event, GUEST_SESSION_COOKIE, guestSessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return buildGuestCartUserId(guestSessionId) || GUEST_CART_USER_ID;
};

export const addProductsToMockCart = (cart: CartInterface, products: Partial<CartProductsInterface>[] = []) => {
  const list = Array.isArray(cart.products) ? cart.products : [];

  for (const raw of products) {
    if (!raw?.id) {
      continue;
    }

    const incoming = normalizeIncomingProductId(String(raw.id));
    const index = list.findIndex((item) => item.id === incoming.id);
    const existing = index >= 0 ? list[index] : undefined;
    const normalized = normalizeCartProduct({ ...raw, id: incoming.id }, existing, 'add');

    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push(normalized);
    }
  }

  cart.products = list.filter((item) => item.id);
  if (cart.userId) {
    cartsByUserId.set(cart.userId, { cart, updatedAt: nowMs() });
  }
  return cart;
};

export const mergeGuestCartIntoMockCart = (userId?: string | null, guestSessionId?: string | null) => {
  const normalizedUserId = String(userId || '').trim();
  const guestUserId = buildGuestCartUserId(guestSessionId);

  if (!normalizedUserId) {
    return null;
  }

  purgeExpiredCarts();

  if (!guestUserId) {
    return getMockCartForUser(normalizedUserId);
  }

  const guestCartEntry = cartsByUserId.get(guestUserId);
  if (!guestCartEntry?.cart) {
    return getMockCartForUser(normalizedUserId);
  }

  const guestProducts = (guestCartEntry.cart.products || []).filter((product) => product.id);
  const userCart = getMockCartForUser(normalizedUserId);

  if (guestProducts.length) {
    addProductsToMockCart(userCart, guestProducts);
  }

  cartsByUserId.delete(guestUserId);

  return userCart;
};

export const setProductsInMockCart = (cart: CartInterface, products: Partial<CartProductsInterface>[] = []) => {
  const list = Array.isArray(cart.products) ? cart.products : [];

  for (const raw of products) {
    if (!raw?.id) {
      continue;
    }

    const incoming = normalizeIncomingProductId(String(raw.id));
    const index = list.findIndex((item) => item.id === incoming.id);
    const existing = index >= 0 ? list[index] : undefined;
    const normalized = normalizeCartProduct({ ...raw, id: incoming.id }, existing, 'set');

    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push(normalized);
    }
  }

  cart.products = list.filter((item) => item.id);
  if (cart.userId) {
    cartsByUserId.set(cart.userId, { cart, updatedAt: nowMs() });
  }
  return cart;
};

export const removeProductsFromMockCart = (cart: CartInterface, ids: string[] = []) => {
  const normalizedIds = ids.map((id) => String(id)).filter(Boolean);
  cart.products = (cart.products || []).filter((product) => !normalizedIds.includes(product.id));
  if (cart.userId) {
    cartsByUserId.set(cart.userId, { cart, updatedAt: nowMs() });
  }
  return cart;
};

export const clearMockCartById = (cartId?: string | null) => {
  const cart = findMockCartById(cartId);

  if (!cart) {
    return null;
  }

  cart.products = [];

  if (cart.userId) {
    cartsByUserId.set(cart.userId, { cart, updatedAt: nowMs() });
  }

  return cart;
};
