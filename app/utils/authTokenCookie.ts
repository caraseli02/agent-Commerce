// The auth token stays readable from JS: $apiClient sends it as a Bearer
// header, so httpOnly would break authenticated calls (#110).
export const authTokenCookieOptions = (requestUrl: URL) => ({
  maxAge: 60 * 60,
  sameSite: 'lax' as const,
  // Plain-HTTP local hosts would drop a secure cookie and lose the session.
  secure: requestUrl.protocol === 'https:',
});
