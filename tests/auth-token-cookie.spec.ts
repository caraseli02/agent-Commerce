import { describe, expect, it } from 'vitest';
import { authTokenCookieOptions } from '../app/utils/authTokenCookie';

describe('authTokenCookieOptions', () => {
  it('keeps the token readable from JS with a one-hour SameSite=Lax cookie', () => {
    const options = authTokenCookieOptions(new URL('http://localhost:3000/'));

    expect(options).toEqual({ maxAge: 60 * 60, sameSite: 'lax', secure: false });
    expect(options).not.toHaveProperty('httpOnly');
  });

  it('marks the cookie secure on HTTPS deployments', () => {
    expect(authTokenCookieOptions(new URL('https://agentcommerce.vercel.app/account')).secure).toBe(true);
  });

  it('leaves secure off on plain-HTTP local hosts so mock login still works', () => {
    expect(authTokenCookieOptions(new URL('http://127.0.0.1:3205/')).secure).toBe(false);
  });
});
