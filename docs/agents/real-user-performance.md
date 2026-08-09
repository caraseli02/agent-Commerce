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
