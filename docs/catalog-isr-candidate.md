# Catalog ISR — controlled mock Preview

Issue #456 / PR #627 installs ISR only when the build is a Vercel Preview
with mock mode explicitly enabled. Production and normal local builds retain
dynamic rendering. `nuxt.config.ts` installs the route rules and serializes
the same private activation setting for origin middleware. The supported
`pnpm build` wrapper protects the completed Vercel output after Nitro exits;
unknown artifacts fail the build before deployment.

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

## Verification and remaining hosted proof

`tests/catalog-isr-policy.spec.ts` checks classification, alias/metadata
rejection, query transport, forwarding and compatibility with the installed
`@vercel/functions/middleware` rewrite helper.
`tests/catalog-isr-output.spec.ts` generates artifacts using the installed
Nitro preset, then checks protection and fail-closed regressions.

`tests/catalog-isr-build.spec.ts` executes the actual supported Nuxt build
in an isolated source copy and inspects the final gate, destinations and
metadata. `tests/catalog-page-cache.spec.ts` checks the final response boundary
for pre-plugin failure, error status and late Set-Cookie. Origin responses
default to no-store and become eligible only after successful rendering;
anonymous SSR uses one viewport representation before client measurement.
Encoded catalog paths are rejected before routing.

Earlier local candidate probes also rendered search/product HTML
and JSON payloads with no identity marker across anonymous, token-cookie,
Authorization and empty-header probes. Browsers at 1280 and 390 pixels rendered
search, query search and product correctly. This proves local origin rendering
and middleware protocol behavior, **not Vercel cache-hit isolation or hosted
revalidation**.

Supported Vercel CLI authentication is available. Use a
controlled protected Preview to prove anonymous MISS/HIT/STALE/regeneration,
identity bypass after a warmed anonymous entry, private-route isolation, query
and payload isolation, original URL preservation, and error/Set-Cookie handling.
The anonymous representation must also be independent of device/request
headers. Add generation timestamps and conservative runtime/error headers as
needed for that proof. Authentication must not weaken deployment protection.
Until that evidence exists, keep the PR draft. The controlled Preview is
validation-only; Production remains dynamic. No independent acceptance is
claimed by prerequisite checks.

Provider references:

- [Build Output routing and routing phases](https://vercel.com/docs/build-output-api/configuration)
- [Routing Middleware placement](https://vercel.com/docs/build-output-api/features#routing-middleware)
- [Prerender expiration and query transport](https://vercel.com/docs/build-output-api/primitives#prerender-configuration-file)
