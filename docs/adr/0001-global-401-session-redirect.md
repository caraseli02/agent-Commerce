# ADR 0001: Global 401 Session Redirect

Status: Accepted
Date: 2026-06-12

## Context

This is a demo app, so the authentication experience should be predictable and low-friction. When an authenticated request fails with `401`, the user should not stay stranded on a protected page.

## Decision

We will treat `401` as a global session-expired signal: sign the user out and redirect them to the session/login flow.

## Consequences

- Public routes must not return `401` for guests.
- Protected experiences will be exited immediately on unauthorized responses.
- Session expiry and missing auth now have one consistent behavior across the app.

## Future

A per-request opt-out for this redirect behavior is deferred until a concrete use case requires it.
