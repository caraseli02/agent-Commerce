# Anonymous catalog cache

The four mock catalog GET handlers (`categories`, `products/new-products`,
`products/[id]`, `products/[path]`) use Nitro server-storage SWR: 30 seconds
fresh, followed by at most 60 seconds of stale service during revalidation.
After 90 seconds a request waits for fresh data; failed refreshes do not extend
that deadline. Errors are never saved. Concurrent refreshes of one key share
Nitro's pending resolver. Storage is local to the Nitro deployment/process;
this is a bounded read optimization, not a distributed consistency guarantee.

Classification occurs before storage lookup. Only mock-mode GET/HEAD requests
on these catalog paths with **no Cookie or Authorization header present** are
eligible (including empty-header rejection). Identity-bearing requests bypass
both cache reads and writes. Search POST, mutations, cart, checkout, account,
orders, dashboard, unknown paths and nonmock mode are excluded.

Resolvers receive a plain input containing the full URL (including the complete
query and host), method, router parameters and mock-mode value. The SHA-256 key
includes that entire input, with a separate namespace per handler. These
resolvers read only repository sample fixtures; they have no access to request
headers, user/session context or per-user data. Keep any future representation
inputs in this input contract/key, and reclassify before adding personalized or
live-backend reads. Query order may produce extra entries but cannot merge
different representations. HEAD has a separate key and retains an empty body.

All API responses, including cached catalog responses and failures, retain
`Cache-Control: private, no-store, max-age=0, must-revalidate`,
`CDN-Cache-Control: no-store` and `Vercel-CDN-Cache-Control: no-store`.
Caching happens only inside Nitro. This prevents an edge lookup **before origin
middleware** from reusing an anonymous response for a later Cookie/Authorization
request, without depending on CDN-specific `Vary` behavior. Do not add public
route-rule/CDN caching to these routes. `X-Catalog-Generated-At` reports the
cached anonymous generation time in epoch milliseconds; bypassed requests omit
it. It is useful for confirming fresh reuse and stale revalidation at runtime.

Nitro 2.13.4's SWR implementation does not enforce `staleMaxAge` in server
storage. The wrapper therefore validates the generation timestamp against the
hard 90-second limit as well as setting explicit freshness/stale options.
`tests/anonymous-catalog-cache.spec.ts` exercises the installed Nitro cache
implementation with HTTP, delayed/failed refreshes, key variants, bypasses, and
a URL-only edge lookup before origin middleware. The cache-policy suite covers
the private API/error header contract.
