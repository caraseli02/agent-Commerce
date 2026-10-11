# Catalog ISR candidate — not activated

Issue #456 / PR #627 remains incomplete. `nuxt.config.ts` does **not** install
`catalogIsrCandidateRules` or `protectCatalogIsrOutput`; normal deployments
retain their existing dynamic rendering. These exports and the Edge policy are
a locally verified prerequisite for controlled preview validation.

The candidate has four prerender assets: search HTML and JSON payload, and
product HTML and JSON payload. The expiration is 30 seconds. Only an anonymous
GET/HEAD with no Cookie, Authorization or identity headers can reach them.
Header presence, including an empty value, rejects eligibility. Search queries
remain dynamic; only the Nuxt payload `_b` transport parameter is accepted.
The cache key contains Nitro's original-route parameter only. Private product
categories and their payload remain dynamic, as do every other route.

The gate must run before the filesystem/ISR lookup. Origin middleware cannot
protect an already cached response. Global Edge placement also rejects direct
ISR aliases, encoded aliases and externally supplied `__isr_route` or
`x-now-route-matches` metadata. Rewrites preserve the original pathname/query
and Cookie/Authorization headers through the installed Vercel middleware
protocol. The installed Nitro Vercel listener reconstructs the original URL
from `__isr_route`; local runtime probes verify search-query preservation.

The output protector checks the exact prerender asset set, expiration/query
metadata and dynamic category overrides. Extra assets, middleware, duplicate
destinations, static fallbacks, error-body exposure and unknown metadata fail
closed. Payload route regular expressions are anchored and escape the filename
dot, preventing a lookalike URL from skipping classification. Run protection
**after the completed Nitro build**: Nuxt's `nitro:compiled` hook can precede the
preset's final output write and its modifications can be overwritten.

## Verification and remaining prerequisite

`tests/catalog-isr-policy.spec.ts` checks classification, alias/metadata
rejection, query transport, forwarding and compatibility with the installed
`@vercel/functions/middleware` rewrite helper.
`tests/catalog-isr-output.spec.ts` generates artifacts using the installed
Nitro preset, then checks protection and fail-closed regressions.

A separate local candidate Nuxt/Vercel build also rendered search/product HTML
and JSON payloads with no identity marker across anonymous, token-cookie,
Authorization and empty-header probes. Browsers at 1280 and 390 pixels rendered
search, query search and product correctly. This proves local origin rendering
and middleware protocol behavior, **not Vercel cache-hit isolation or hosted
revalidation**.

Before activating route rules, complete supported Vercel CLI sign-in and use a
controlled protected preview to prove anonymous MISS/HIT/STALE/regeneration,
identity bypass after a warmed anonymous entry, private-route isolation, query
and payload isolation, original URL preservation, and error/Set-Cookie handling.
The anonymous representation must also be independent of device/request
headers. Add generation timestamps and conservative runtime/error headers as
needed for that proof. Authentication must not weaken deployment protection.
Until that evidence exists, keep the PR draft and caching disabled; no
independent acceptance is claimed by these prerequisite checks.

Provider references:

- [Build Output routing and routing phases](https://vercel.com/docs/build-output-api/configuration)
- [Routing Middleware placement](https://vercel.com/docs/build-output-api/features#routing-middleware)
- [Prerender expiration and query transport](https://vercel.com/docs/build-output-api/primitives#prerender-configuration-file)
