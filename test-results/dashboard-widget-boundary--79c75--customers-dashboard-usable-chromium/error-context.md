# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-widget-boundary.spec.ts >> Dashboard widget error boundaries >> contained Returning Customers fault keeps customers dashboard usable
- Location: tests/e2e/dashboard-widget-boundary.spec.ts:22:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-dashboard-widget-boundary="returning-customers"]')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('[data-dashboard-widget-boundary="returning-customers"]')

```

```yaml
- banner:
    - searchbox
    - img
    - button:
        - img
    - button "Open notifications":
        - button "Open notifications":
            - img
    - button "Avatar Demo Admin Admin":
        - img "Avatar"
        - text: Demo Admin Admin
- complementary:
    - link:
        - /url: /
        - img
    - navigation:
        - list:
            - listitem:
                - link:
                    - /url: /dashboard
                    - img
            - listitem:
                - button [disabled]:
                    - img
            - listitem:
                - link:
                    - /url: /dashboard/customers
                    - img
            - listitem:
                - link:
                    - /url: /dashboard/orders
                    - img
    - button:
        - img
    - text: V 1.0.0
- main:
    - link "Home":
        - /url: /dashboard
        - img
        - text: Home
    - text: /
    - link "Customers":
        - /url: /dashboard/customers
    - heading "Customers" [level=2]
    - button "Download" [disabled]:
        - text: Download
        - img
    - text: Customers by Country
    - img
    - text: 'United States 18 Market Share: 83%'
    - img
    - button "Zoom in"
    - button "Zoom out"
    - text: Customers Total
    - img
    - text: '10'
    - img
    - img
    - text: 12.5%
    - button "Last 7 Days":
        - text: Last 7 Days
        - img
    - button "View more" [disabled]:
        - text: View more
        - img
    - text: Returning Customers
    - img
    - text: '6'
    - img
    - text: 6.2%
    - button "Last 7 Days":
        - text: Last 7 Days
        - img
    - button "View more" [disabled]:
        - text: View more
        - img
    - text: New Customers
    - link "Melissa Anderson Melissa Anderson melissa.anderson@example.com":
        - /url: /dashboard/customers/customer-010
        - img "Melissa Anderson"
        - text: Melissa Anderson melissa.anderson@example.com
    - button:
        - img
    - link "Kevin Thompson Kevin Thompson kevin.thompson@example.com":
        - /url: /dashboard/customers/customer-009
        - img "Kevin Thompson"
        - text: Kevin Thompson kevin.thompson@example.com
    - button:
        - img
    - link "Jessica Taylor Jessica Taylor jessica.taylor@example.com":
        - /url: /dashboard/customers/customer-008
        - img "Jessica Taylor"
        - text: Jessica Taylor jessica.taylor@example.com
    - button:
        - img
    - link "David Lee David Lee david.lee@example.com":
        - /url: /dashboard/customers/customer-007
        - img "David Lee"
        - text: David Lee david.lee@example.com
    - button:
        - img
    - link "Amanda Brown Amanda Brown amanda.brown@example.com":
        - /url: /dashboard/customers/customer-006
        - img "Amanda Brown"
        - text: Amanda Brown amanda.brown@example.com
    - button:
        - img
    - link "Robert Wilson Robert Wilson robert.wilson@example.com":
        - /url: /dashboard/customers/customer-005
        - img "Robert Wilson"
        - text: Robert Wilson robert.wilson@example.com
    - img
    - button:
        - img
    - link "Emily Davis Emily Davis emily.davis@example.com":
        - /url: /dashboard/customers/customer-004
        - img "Emily Davis"
        - text: Emily Davis emily.davis@example.com
    - button:
        - img
    - heading "Customers List" [level=2]
    - button:
        - img
    - button:
        - img
    - textbox "Filter customers..."
    - button "Type":
        - img
        - text: Type
    - button "Company":
        - img
        - text: Company
    - button "Date":
        - img
        - text: Date
    - button "Spent":
        - img
        - text: Spent
    - button "Orders count":
        - img
        - text: Orders count
    - region "Data table":
        - table:
            - rowgroup:
                - row "Name Account type Company Date Spent Orders count Actions":
                    - columnheader "Name":
                        - text: Name
                        - img
                    - columnheader "Account type":
                        - text: Account type
                        - img
                    - columnheader "Company":
                        - text: Company
                        - img
                    - columnheader "Date":
                        - text: Date
                        - img
                    - columnheader "Spent":
                        - text: Spent
                        - img
                    - columnheader "Orders count":
                        - text: Orders count
                        - img
                    - columnheader "Actions"
            - rowgroup:
                - row "John Smith john.smith@example.com P Personal 15 January 2023, 10:30 lei 3,699.95 4 5% Open menu":
                    - cell "John Smith john.smith@example.com":
                        - button "John Smith john.smith@example.com":
                            - list:
                                - listitem: John Smith
                                - listitem: john.smith@example.com
                            - link:
                                - /url: /dashboard/customers/customer-001
                    - cell "P Personal"
                    - cell
                    - cell "15 January 2023, 10:30"
                    - cell "lei 3,699.95"
                    - cell "4"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "Sarah Johnson sarah.johnson@example.com P Personal 20 March 2023, 09:15 lei 879.96 2 5% Open menu":
                    - cell "Sarah Johnson sarah.johnson@example.com":
                        - button "Sarah Johnson sarah.johnson@example.com":
                            - list:
                                - listitem: Sarah Johnson
                                - listitem: sarah.johnson@example.com
                            - link:
                                - /url: /dashboard/customers/customer-002
                    - cell "P Personal"
                    - cell
                    - cell "20 March 2023, 09:15"
                    - cell "lei 879.96"
                    - cell "2"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "Michael Chen michael.chen@example.com P Personal 10 May 2023, 14:00 lei 2,799.93 2 5% Open menu":
                    - cell "Michael Chen michael.chen@example.com":
                        - button "Michael Chen michael.chen@example.com":
                            - list:
                                - listitem: Michael Chen
                                - listitem: michael.chen@example.com
                            - link:
                                - /url: /dashboard/customers/customer-003
                    - cell "P Personal"
                    - cell
                    - cell "10 May 2023, 14:00"
                    - cell "lei 2,799.93"
                    - cell "2"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "Emily Davis emily.davis@example.com P Personal 25 June 2023, 11:30 lei 849.97 2 5% Open menu":
                    - cell "Emily Davis emily.davis@example.com":
                        - button "Emily Davis emily.davis@example.com":
                            - list:
                                - listitem: Emily Davis
                                - listitem: emily.davis@example.com
                            - link:
                                - /url: /dashboard/customers/customer-004
                    - cell "P Personal"
                    - cell
                    - cell "25 June 2023, 11:30"
                    - cell "lei 849.97"
                    - cell "2"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "Robert Wilson robert.wilson@example.com P Personal 15 August 2023, 13:45 lei 699.99 2 5% Open menu":
                    - cell "Robert Wilson robert.wilson@example.com":
                        - button "Robert Wilson robert.wilson@example.com":
                            - list:
                                - listitem: Robert Wilson
                                - listitem: robert.wilson@example.com
                            - link:
                                - /url: /dashboard/customers/customer-005
                    - cell "P Personal"
                    - cell
                    - cell "15 August 2023, 13:45"
                    - cell "lei 699.99"
                    - cell "2"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "Amanda Brown amanda.brown@example.com P Personal 20 September 2023, 10:00 lei 929.96 2 5% Open menu":
                    - cell "Amanda Brown amanda.brown@example.com":
                        - button "Amanda Brown amanda.brown@example.com":
                            - list:
                                - listitem: Amanda Brown
                                - listitem: amanda.brown@example.com
                            - link:
                                - /url: /dashboard/customers/customer-006
                    - cell "P Personal"
                    - cell
                    - cell "20 September 2023, 10:00"
                    - cell "lei 929.96"
                    - cell "2"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "David Lee david.lee@example.com P Personal 15 October 2023, 11:00 lei 1,099.97 1 5% Open menu":
                    - cell "David Lee david.lee@example.com":
                        - button "David Lee david.lee@example.com":
                            - list:
                                - listitem: David Lee
                                - listitem: david.lee@example.com
                            - link:
                                - /url: /dashboard/customers/customer-007
                    - cell "P Personal"
                    - cell
                    - cell "15 October 2023, 11:00"
                    - cell "lei 1,099.97"
                    - cell "1"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "Jessica Taylor jessica.taylor@example.com P Personal 25 November 2023, 12:00 lei 849.97 1 5% Open menu":
                    - cell "Jessica Taylor jessica.taylor@example.com":
                        - button "Jessica Taylor jessica.taylor@example.com":
                            - list:
                                - listitem: Jessica Taylor
                                - listitem: jessica.taylor@example.com
                            - link:
                                - /url: /dashboard/customers/customer-008
                    - cell "P Personal"
                    - cell
                    - cell "25 November 2023, 12:00"
                    - cell "lei 849.97"
                    - cell "1"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "Kevin Thompson kevin.thompson@example.com P Personal 10 December 2023, 13:30 lei 849.97 1 5% Open menu":
                    - cell "Kevin Thompson kevin.thompson@example.com":
                        - button "Kevin Thompson kevin.thompson@example.com":
                            - list:
                                - listitem: Kevin Thompson
                                - listitem: kevin.thompson@example.com
                            - link:
                                - /url: /dashboard/customers/customer-009
                    - cell "P Personal"
                    - cell
                    - cell "10 December 2023, 13:30"
                    - cell "lei 849.97"
                    - cell "1"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
                - row "Melissa Anderson melissa.anderson@example.com P Personal 20 January 2024, 09:15 lei 449.97 1 5% Open menu":
                    - cell "Melissa Anderson melissa.anderson@example.com":
                        - button "Melissa Anderson melissa.anderson@example.com":
                            - list:
                                - listitem: Melissa Anderson
                                - listitem: melissa.anderson@example.com
                            - link:
                                - /url: /dashboard/customers/customer-010
                    - cell "P Personal"
                    - cell
                    - cell "20 January 2024, 09:15"
                    - cell "lei 449.97"
                    - cell "1"
                    - cell "5% Open menu":
                        - text: 5%
                        - img
                        - img
                        - button "Open menu":
                            - img
                            - text: Open menu
    - text: 10 item(s) Page 1 of 1
    - button "Go to first page" [disabled]:
        - text: Go to first page
        - img
    - button "Go to previous page" [disabled]:
        - text: Go to previous page
        - img
    - button "Go to next page" [disabled]:
        - text: Go to next page
        - img
    - button "Go to last page" [disabled]:
        - text: Go to last page
        - img
    - text: ECAS portfolio demo — mock mode for reviewer walkthroughs
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
> 36 |     await expect(boundary).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
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
  64 |     expect(runtimeErrors).toEqual([]);
  65 |   });
  66 | });
  67 |
```
