import type { CartInterface, CartProductsInterface } from '~/types/cart';
import { getCookie, setCookie, type H3Event } from 'h3';
import { calculateCartLinePricing, clampCartQuantity } from '~/helpers/cart-pricing';
import { mockProducts } from '~/server/utils/mockProducts';
import { parseMockUserIdFromToken } from '~/server/utils/mockUsers';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';
import type { DiscountInterface } from '~/types/auth/account-settings';

const GUEST_CART_USER_ID = 'guest-user-session';
const GUEST_SESSION_COOKIE = 'guest-session-id';

const nowIso = () => new Date().toISOString();

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

export const getExistingMockCartUserId = (event: H3Event, authorizationHeader?: string | null) => {
  const userId = parseMockUserIdFromToken(authorizationHeader);
  if (userId) return userId;

  return buildGuestCartUserId(getCookie(event, GUEST_SESSION_COOKIE));
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

const serializeCartForStorage = ({ revision: _revision, ...cart }: CartInterface): CartInterface => ({
  ...cart,
  products: (cart.products || []).map(({ productEntity: _productEntity, ...product }) => product),
});

const hydrateCartFromStorage = (cart: CartInterface): CartInterface => ({
  ...cart,
  products: (cart.products || []).map((product) => {
    const productEntity = product.productEntity || resolveMockProduct(product.id);
    if (!productEntity) {
      return product;
    }

    return normalizeCartProduct(
      {
        id: product.id,
        stock: product.stock,
        backorder_stock: product.backorder_stock,
        isFolder: product.isFolder,
      },
      { ...product, productEntity },
      'set',
    );
  }),
});

type CartRow = {
  owner_id: string;
  cart_id: string;
  revision: number;
  payload_json: string;
};

const parseCartRow = (row: CartRow) => {
  const cart = hydrateCartFromStorage(JSON.parse(row.payload_json) as CartInterface);
  cart.products = Array.isArray(cart.products) ? cart.products : [];
  cart.revision = String(row.revision);
  return cart;
};

const selectCartForOwner = async (userId: string) => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<CartRow>(
    'SELECT owner_id, cart_id, revision, payload_json FROM checkout_carts WHERE owner_id = $1 FOR UPDATE',
    [userId],
  );
  return rows[0] || null;
};

const persistCart = async (cart: CartInterface) => {
  if (!cart.userId) return;
  const database = await getCheckoutDatabase();
  const rows = await database.query<{ revision: number }>(
    `UPDATE checkout_carts
       SET payload_json = $1, revision = revision + 1, updated_at = $2
     WHERE owner_id = $3
     RETURNING revision`,
    [JSON.stringify(serializeCartForStorage(cart)), nowIso(), cart.userId],
  );
  if (rows[0]) cart.revision = String(rows[0].revision);
};

export const getMockCartForUser = async (userId: string) =>
  withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const timestamp = nowIso();
    const cart: CartInterface = {
      _id: `mock-cart-${userId}`,
      userId,
      products: [],
      startDate: timestamp,
      endDate: timestamp,
    };

    await database.execute(
      `INSERT INTO checkout_carts (owner_id, cart_id, revision, payload_json, updated_at)
       VALUES ($1, $2, 1, $3, $4)
       ON CONFLICT (owner_id) DO NOTHING`,
      [userId, String(cart._id), JSON.stringify(cart), timestamp],
    );

    const row = await selectCartForOwner(userId);
    if (!row) {
      throw new Error(`Checkout cart ${cart._id} could not be loaded after creation.`);
    }

    return parseCartRow(row);
  });

export const findMockCartById = async (cartId?: string | null) => {
  const normalizedId = String(cartId || '').trim();

  if (!normalizedId) {
    return null;
  }

  const database = await getCheckoutDatabase();
  const rows = await database.query<CartRow>(
    'SELECT owner_id, cart_id, revision, payload_json FROM checkout_carts WHERE cart_id = $1 FOR UPDATE',
    [normalizedId],
  );
  return rows[0] ? parseCartRow(rows[0]) : null;
};

export const requireMockCartUserId = (event: H3Event, authorizationHeader?: string | null) => {
  const userId = getExistingMockCartUserId(event, authorizationHeader);

  if (userId) {
    return userId;
  }

  const guestSessionId = crypto.randomUUID();
  setCookie(event, GUEST_SESSION_COOKIE, guestSessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return buildGuestCartUserId(guestSessionId) || GUEST_CART_USER_ID;
};

export const addProductsToMockCart = async (cart: CartInterface, products: Partial<CartProductsInterface>[] = []) => {
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
  await persistCart(cart);
  return cart;
};

export const mergeGuestCartIntoMockCart = async (userId?: string | null, guestSessionId?: string | null) =>
  withCheckoutTransaction(async () => {
    const normalizedUserId = String(userId || '').trim();
    const guestUserId = buildGuestCartUserId(guestSessionId);

    if (!normalizedUserId) {
      return null;
    }

    if (!guestUserId) {
      return await getMockCartForUser(normalizedUserId);
    }

    const guestCart = await findMockCartById(`mock-cart-${guestUserId}`);
    if (!guestCart) {
      return await getMockCartForUser(normalizedUserId);
    }

    const guestProducts = (guestCart.products || []).filter((product) => product.id);
    const userCart = await getMockCartForUser(normalizedUserId);

    if (guestProducts.length) {
      await addProductsToMockCart(userCart, guestProducts);
    }

    // Keep the revision sequence: checkout claims still reference this guest cart
    // after login, so recreating revision 1 could alias a later purchase to them.
    guestCart.products = [];
    await persistCart(guestCart);

    return userCart;
  });

export const setProductsInMockCart = async (cart: CartInterface, products: Partial<CartProductsInterface>[] = []) => {
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
  await persistCart(cart);
  return cart;
};

export const removeProductsFromMockCart = async (cart: CartInterface, ids: string[] = []) => {
  const normalizedIds = ids.map((id) => String(id)).filter(Boolean);
  cart.products = (cart.products || []).filter((product) => !normalizedIds.includes(product.id));
  await persistCart(cart);
  return cart;
};

export const clearMockCartById = async (cartId?: string | null) => {
  const cart = await findMockCartById(cartId);

  if (!cart) {
    return null;
  }

  cart.products = [];

  await persistCart(cart);

  return cart;
};
