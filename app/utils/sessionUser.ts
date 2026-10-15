import { parseMockToken } from '~/utils/mockAuth';

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
    return parseMockToken(token)?.userId || null;
  }

  const userId = decodeJwtPayload(token)?.user_id;
  return typeof userId === 'string' && userId ? userId : null;
};
