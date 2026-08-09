# Real-user performance monitoring

ECAS uses Vercel Speed Insights to collect real-user Web Vitals from production
visits. Its client plugin injects the collector only in production; it does not
send metrics from local development or test runs.

The collector reports the Core Web Vitals (LCP, CLS, and INP), together with FCP
and TTFB, to Vercel's first-party Speed Insights endpoint. It records route-level
measurements without requiring this demo to persist visitor telemetry in a Nitro
function.

## Enable and review

1. In the Vercel project that serves `ecas-nine.vercel.app`, enable **Speed
   Insights**.
2. Deploy this change.
3. Open **Speed Insights** in the Vercel dashboard after real visits arrive.
4. Filter the report by **device type** and use the **75th percentile** when
   reviewing mobile and desktop separately.

The public PageSpeed Insights report may remain empty until Chrome's CrUX dataset
has enough traffic. Speed Insights starts collecting from the first production
visits after the deployment, so it is the source of truth for this portfolio
deployment's real-user measurements.

## Synthetic checks for the demo

Use `pnpm test:performance` with the app running to produce repeatable mobile
performance measurements before release. To check the deployed demo, run
`PLAYWRIGHT_BASE_URL=https://ecas-nine.vercel.app pnpm test:performance`. It uses
three cold-cache samples with a Fast 3G connection, 4x CPU slowdown, and a 412px
mobile viewport. The test reports the median FCP, LCP, CLS, and cart interaction
duration, then enforces these regression budgets: FCP and LCP at most 3 seconds,
CLS at most 0.1, and the cart interaction at most 200ms.

This is synthetic evidence, not a replacement for INP in the field: it measures a
representative cart interaction using the Event Timing API while Speed Insights
collects page-lifetime INP from real visitors.
