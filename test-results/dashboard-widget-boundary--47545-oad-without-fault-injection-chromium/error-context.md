# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-widget-boundary.spec.ts >> Dashboard widget error boundaries >> healthy Admin Smoke Path routes still load without fault injection
- Location: tests/e2e/dashboard-widget-boundary.spec.ts:45:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 36

- Array []
+ Array [
+   "[Vue warn]: Failed to resolve component: ReturningCustomersChart
+ If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.
+   at <ReturningCustomers class=\"md:row-start-3 md:col-start-1 xl:col-start-2 xl:row-start-2\" >
+   at <AsyncComponentWrapper class=\"md:row-start-3 md:col-start-1 xl:col-start-2 xl:row-start-2\" >
+   at <Index id=\"nuxt_page\" class=\"relative\" onVnodeUnmounted=fn<onVnodeUnmounted>  ... >
+   at <RouteProvider key=\"/dashboard/customers\" vnode= {__v_isVNode: true, __v_skip: true, type: Object, props: Object, key: null} route= {fullPath: /dashboard/customers, hash: , query: Object, name: dashboard-customers, path: /dashboard/customers}  ... >
+   at <RouterView name=undefined route=undefined id=\"nuxt_page\"  ... >
+   at <NuxtPage id=\"nuxt_page\" class=\"relative\" >
+   at <Dashboard ref=Ref< undefined > >
+   at <AsyncComponentWrapper ref=Ref< undefined > >
+   at <LayoutLoader key=\"dashboard\" layoutProps= {ref: RefImpl} name=\"dashboard\" >
+   at <NuxtLayoutProvider layoutProps= {ref: RefImpl} key=\"dashboard\" name=\"dashboard\"  ... >
+   at <NuxtLayout>
+   at <TooltipProvider disableHoverableContent=false disableClosingTrigger=false disabled=false  ... >
+   at <TooltipProvider>
+   at <App key=4 >
+   at <NuxtRoot>",
+   "[Vue warn]: Failed to resolve component: ReturningCustomersChart
+ If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.
+   at <ReturningCustomers class=\"md:row-start-3 md:col-start-1 xl:col-start-2 xl:row-start-2\" >
+   at <AsyncComponentWrapper class=\"md:row-start-3 md:col-start-1 xl:col-start-2 xl:row-start-2\" >
+   at <Index id=\"nuxt_page\" class=\"relative\" onVnodeUnmounted=fn<onVnodeUnmounted>  ... >
+   at <RouteProvider key=\"/dashboard/customers\" vnode= {__v_isVNode: true, __v_skip: true, type: Object, props: Object, key: null} route= {fullPath: /dashboard/customers, hash: , query: Object, name: dashboard-customers, path: /dashboard/customers}  ... >
+   at <RouterView name=undefined route=undefined id=\"nuxt_page\"  ... >
+   at <NuxtPage id=\"nuxt_page\" class=\"relative\" >
+   at <Dashboard ref=Ref< undefined > >
+   at <AsyncComponentWrapper ref=Ref< undefined > >
+   at <LayoutLoader key=\"dashboard\" layoutProps= {ref: RefImpl} name=\"dashboard\" >
+   at <NuxtLayoutProvider layoutProps= {ref: RefImpl} key=\"dashboard\" name=\"dashboard\"  ... >
+   at <NuxtLayout>
+   at <TooltipProvider disableHoverableContent=false disableClosingTrigger=false disabled=false  ... >
+   at <TooltipProvider>
+   at <App key=4 >
+   at <NuxtRoot>",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
    - banner [ref=e4]:
        - generic [ref=e5]:
            - generic [ref=e6]:
                - searchbox [ref=e7]
                - img [ref=e8]
            - generic [ref=e10]:
                - button [ref=e11] [cursor=pointer]:
                    - img [ref=e12]
                - generic [ref=e14]:
                    - button "Open notifications" [ref=e17] [cursor=pointer]:
                        - button "Open notifications" [ref=e18]:
                            - img [ref=e21]
                    - button "Avatar Demo Admin Admin" [ref=e27] [cursor=pointer]:
                        - img "Avatar" [ref=e29]
                        - generic [ref=e31]:
                            - generic [ref=e32]: Demo Admin
                            - generic [ref=e33]: Admin
    - complementary [ref=e34]:
        - link [ref=e36] [cursor=pointer]:
            - /url: /
            - img [ref=e37]
        - navigation [ref=e40]:
            - list [ref=e41]:
                - listitem [ref=e42]:
                    - link [ref=e43] [cursor=pointer]:
                        - /url: /dashboard
                        - img [ref=e45]
                - listitem [ref=e47]:
                    - button [disabled] [ref=e48]:
                        - img [ref=e50]
                - listitem [ref=e52]:
                    - link [ref=e53] [cursor=pointer]:
                        - /url: /dashboard/customers
                        - img [ref=e55]
                - listitem [ref=e57]:
                    - link [ref=e58] [cursor=pointer]:
                        - /url: /dashboard/orders
                        - img [ref=e60]
        - button [ref=e64] [cursor=pointer]:
            - img [ref=e65]
        - generic [ref=e69]: V 1.0.0
    - main [ref=e70]:
        - generic [ref=e71]:
            - generic [ref=e72]:
                - generic [ref=e73]:
                    - generic [ref=e74]:
                        - link "Home" [ref=e75] [cursor=pointer]:
                            - /url: /dashboard
                            - img [ref=e76]
                            - generic [ref=e78]: Home
                        - generic [ref=e79]: /
                        - link "Customers" [ref=e80] [cursor=pointer]:
                            - /url: /dashboard/customers
                        - generic [ref=e81]: /
                        - link "John Smith" [ref=e82] [cursor=pointer]:
                            - /url: /dashboard/customers/customer-001
                        - generic [ref=e83]: /
                        - link "Control Panel" [ref=e84] [cursor=pointer]:
                            - /url: /dashboard/customers/customer-001/control-panel/account
                        - generic [ref=e85]: /
                        - generic [ref=e86]: account
                    - heading "Control Panel" [level=2] [ref=e87]
                - generic [ref=e89]:
                    - generic [ref=e90]:
                        - generic [ref=e91]: Credit Limit
                        - generic [ref=e93]: 21,000.00 Lei
                    - generic [ref=e94]:
                        - generic [ref=e95]: Available Credit
                        - generic [ref=e97]: 4,310.44 Lei
            - generic [ref=e98]:
                - region "Control panel sections" [ref=e99]:
                    - generic [ref=e100]:
                        - link "Account" [ref=e101] [cursor=pointer]:
                            - /url: /dashboard/customers/customer-001/control-panel/account
                        - link "Shipping" [ref=e102] [cursor=pointer]:
                            - /url: /dashboard/customers/customer-001/control-panel/shipping
                        - link "Billing" [ref=e103] [cursor=pointer]:
                            - /url: /dashboard/customers/customer-001/control-panel/billing
                        - link "Transaction history" [ref=e104] [cursor=pointer]:
                            - /url: /dashboard/customers/customer-001/control-panel/transaction-history
                - generic [ref=e107]:
                    - generic [ref=e108]:
                        - heading "Account Details" [level=2] [ref=e109]
                        - generic [ref=e110]:
                            - button "Edit" [ref=e111] [cursor=pointer]:
                                - img [ref=e112]
                                - generic [ref=e114]: Edit
                            - button "Copy Details" [ref=e115] [cursor=pointer]:
                                - img [ref=e116]
                                - generic [ref=e118]: Copy Details
                    - generic [ref=e119]:
                        - generic [ref=e120]:
                            - generic [ref=e121]: Name
                            - textbox "Name" [disabled] [ref=e123]: John
                        - generic [ref=e124]:
                            - generic [ref=e125]: Name
                            - textbox "Name" [disabled] [ref=e127]: Smith
                        - generic [ref=e128]:
                            - generic [ref=e129]: Country
                            - button "United States United States" [disabled] [ref=e130]:
                                - generic [ref=e131]:
                                    - img "United States" [ref=e132]
                                    - generic [ref=e133]: United States
                                - img [ref=e134]
                        - generic [ref=e136]:
                            - generic [ref=e137]: County/Region
                            - button [disabled] [ref=e138]:
                                - img [ref=e139]
                        - generic [ref=e141]:
                            - generic [ref=e142]: City
                            - textbox "City" [disabled] [ref=e144]:
                                - /placeholder: Georgia
                                - text: New York
                        - generic [ref=e145]:
                            - generic [ref=e146]: Address Line 1
                            - textbox "Address Line 1" [disabled] [ref=e148]:
                                - /placeholder: 5073 Mark Brown Rd
                                - text: 123 Main St
                        - generic [ref=e149]:
                            - generic [ref=e150]: Address Line 2
                            - textbox "Address Line 2" [disabled] [ref=e152]:
                                - /placeholder: NE Dalton
                        - generic [ref=e153]:
                            - generic [ref=e154]: Postcode
                            - textbox "Postcode" [disabled] [ref=e156]:
                                - /placeholder: ''
                                - text: '10001'
                        - generic [ref=e157]:
                            - generic [ref=e158]: Phone Number
                            - textbox "Phone Number" [disabled] [ref=e160]:
                                - /placeholder: +1 (706) 275-0767
                                - text: +1-555-0101
                        - generic [ref=e161]:
                            - generic [ref=e162]: Email
                            - textbox "Email" [disabled] [ref=e164]:
                                - /placeholder: madalina.dobrovolski@company.com
                                - text: john.smith@example.com
        - generic [ref=e165]: ECAS portfolio demo — mock mode for reviewer walkthroughs
    - region "Notifications (F8)":
        - list
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  |
  3  | const signInAsAdmin = async (page: Page) => {
  4  |   await page.goto('/?signin=true', { waitUntil: 'networkidle' });
  5  |
  6  |   await page.getByRole('radio', { name: 'Admin Preview' }).click();
  7  |   await expect(page.getByLabel('E-mail or client code')).toHaveValue('admin@demo.com');
  8  |   await expect(page.getByPlaceholder('Hidden for demo sign-in')).toHaveValue('');
  9  |
  10 |   const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  11 |   await expect(signInButton).toBeVisible();
  12 |
  13 |   await Promise.all([
  14 |     page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
  15 |     signInButton.click(),
  16 |   ]);
  17 |
  18 |   await expect(page).toHaveURL(/\/dashboard\/orders$/);
  19 | };
  20 |
  21 | test.describe('Dashboard widget error boundaries', () => {
  22 |   test('contained Returning Customers fault keeps customers dashboard usable', async ({ page }) => {
  23 |     const runtimeErrors: string[] = [];
  24 |     page.on('pageerror', (error) => runtimeErrors.push(error.message));
  25 |
  26 |     await signInAsAdmin(page);
  27 |     runtimeErrors.length = 0;
  28 |
  29 |     await page.goto('/dashboard/customers?dashboardFault=returning-customers', { waitUntil: 'domcontentloaded' });
  30 |
  31 |     await expect(page.getByText(/customers by country/i)).toBeVisible();
  32 |     await expect(page.getByText(/customers list/i)).toBeVisible();
  33 |     await expect(page.getByText(/john smith/i).first()).toBeVisible();
  34 |
  35 |     const boundary = page.locator('[data-dashboard-widget-boundary="returning-customers"]');
  36 |     await expect(boundary).toBeVisible();
  37 |     await expect(boundary.getByRole('alert')).toBeVisible();
  38 |     await expect(boundary.getByText(/returning customers couldn't load/i)).toBeVisible();
  39 |     await expect(boundary.getByRole('button', { name: 'Try again' })).toBeVisible();
  40 |     await expect(boundary.getByRole('link', { name: 'Back to customers' })).toBeVisible();
  41 |
  42 |     expect(runtimeErrors.filter((message) => message.includes('Forced fault for dashboard widget'))).toHaveLength(0);
  43 |   });
  44 |
  45 |   test('healthy Admin Smoke Path routes still load without fault injection', async ({ page }) => {
  46 |     const runtimeErrors: string[] = [];
  47 |     page.on('pageerror', (error) => runtimeErrors.push(error.message));
  48 |     page.on('console', (message) => {
  49 |       if (message.type() === 'error' || message.type() === 'warning') {
  50 |         runtimeErrors.push(message.text());
  51 |       }
  52 |     });
  53 |
  54 |     await signInAsAdmin(page);
  55 |     runtimeErrors.length = 0;
  56 |
  57 |     await page.goto('/dashboard/customers', { waitUntil: 'domcontentloaded' });
  58 |     await expect(page.getByText(/returning customers/i)).toBeVisible();
  59 |     await expect(page.locator('[data-dashboard-widget-boundary="returning-customers"]')).toHaveCount(0);
  60 |
  61 |     await page.goto('/dashboard/customers/customer-001/control-panel/account', { waitUntil: 'domcontentloaded' });
  62 |     await expect(page.getByRole('heading', { name: /account details/i })).toBeVisible();
  63 |
> 64 |     expect(runtimeErrors).toEqual([]);
     |                           ^ Error: expect(received).toEqual(expected) // deep equality
  65 |   });
  66 | });
  67 |
```
