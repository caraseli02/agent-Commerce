/**
 * Adds the session token as a bearer header unless the caller already sent one.
 * Sign-in passes the freshly issued token explicitly, so a stale `token` cookie
 * must never replace it.
 */
export const withSessionAuthorization = (headersInit: HeadersInit | undefined, sessionToken?: string | null) => {
  const headers = headersInit instanceof Headers ? headersInit : new Headers(headersInit);

  if (sessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  return headers;
};
