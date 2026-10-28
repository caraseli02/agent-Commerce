import { readSessionToken } from '~/utils/sessionToken';

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** User id the session token identifies, or null when it identifies nobody (SSR has no other auth source). */
export const resolveSessionUserId = (token: string | null | undefined, mockMode: boolean): string | null => {
  if (!token) return null;

  if (mockMode) {
    return readSessionToken(token)?.userId || null;
  }

  const userId = decodeJwtPayload(token)?.user_id;
  return typeof userId === 'string' && userId ? userId : null;
};

type HydrationContext = { store: { userDetails?: unknown; $persist?: () => void } };
const serverUserDetails = new WeakMap<object, unknown>();

/**
 * Persist hooks for the auth store. SSR resolves userDetails from the token cookie
 * (plugins/auth-session.server.ts); keep those over an older localStorage snapshot so the
 * client hydrates with the same customer pricing the server rendered.
 */
export const keepServerUserDetails = {
  beforeHydrate: ({ store }: HydrationContext) => {
    // Copy: the persisted patch deep-merges into the same object.
    if (store.userDetails) serverUserDetails.set(store, JSON.parse(JSON.stringify(store.userDetails)));
  },
  afterHydrate: ({ store }: HydrationContext) => {
    if (!serverUserDetails.has(store)) return;
    store.userDetails = serverUserDetails.get(store);
    serverUserDetails.delete(store);
    // The persistence subscriber is not attached yet; replace the stale snapshot now.
    store.$persist?.();
  },
};
