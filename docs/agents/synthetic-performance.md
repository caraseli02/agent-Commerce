# Synthetic performance testing

ECAS is a demo project without sufficient visitor volume for useful real-user
Core Web Vitals data. It therefore uses a repeatable synthetic performance check
instead of a paid real-user monitoring service.

## Run the check

Run `pnpm test:performance` with the app running locally. To check the deployed
demo, run:

```sh
PLAYWRIGHT_BASE_URL=https://ecas-nine.vercel.app pnpm test:performance
```

The test takes three cold-cache samples on a 412px mobile viewport with a Fast
3G connection and 4x CPU slowdown. It reports median FCP, LCP, CLS, and a cart
interaction duration, then enforces these regression budgets:

- FCP and LCP: at most 3 seconds
- CLS: at most 0.1
- Cart interaction: at most 200ms

The interaction duration uses the Event Timing API as a repeatable proxy; it is
not field INP. If this demo later gains meaningful traffic, add real-user
monitoring only after selecting an appropriate privacy and cost model.
