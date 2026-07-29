# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-smoke-path.spec.ts >> Admin Smoke Path >> admin preview can load orders, customers, and a customer control panel
- Location: tests/e2e/admin-smoke-path.spec.ts:22:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard\/orders$/
Received string:  "http://127.0.0.1:3000/?signin=true"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    6 × unexpected value "http://127.0.0.1:3000/?signin=true"
    2 × waiting for" http://127.0.0.1:3000/?signin=true" navigation to finish...
      - navigated to "http://127.0.0.1:3000/?signin=true"
    17 × unexpected value "http://127.0.0.1:3000/?signin=true"

```

```yaml
- dialog "Your account":
    - banner:
        - heading "Your account" [level=2]
        - button "Close account panel":
            - img
    - paragraph: Demo Admin
    - img
    - paragraph: admin@demo.com
    - text: 'Client code: A-123456'
    - button "Copy client code A-123456"
    - text: 'Available Credit 0.00 Lei Spent: 0.00 Lei'
    - link "View more":
        - /url: '#'
        - text: View more
        - img
    - link "Dashboard":
        - /url: /dashboard
        - img
        - text: Dashboard
    - button "Notifications":
        - img
        - text: Notifications
    - link "Price Offer COMING SOON":
        - /url: /
        - img
        - text: Price Offer COMING SOON
    - link "BOM Upload COMING SOON":
        - /url: /
        - img
        - text: BOM Upload COMING SOON
    - link "Order Tracking":
        - /url: /dashboard
        - img
        - text: Order Tracking
    - link "Order History":
        - /url: /dashboard/orders
        - img
        - text: Order History
    - link "Settings":
        - /url: /dashboard
        - img
        - text: Settings
    - button "Sign Out":
        - img
        - text: Sign Out
    - paragraph:
        - img
        - text: For assistance please contact
        - link "support@demo.app":
            - /url: mailto:support@demo.app
- banner:
    - img
    - text: 'Sales: +1 800 555 0199 (Mon-Fri 8:00AM - 4:00PM EST) Free shipping on orders over 150 Lei'
    - button "Regional preferences":
        - img
        - text: EN · Lei
    - link:
        - /url: /
        - img: DEMO
    - img
    - searchbox
    - img
    - button "Open shopping cart":
        - img
        - text: 1 999.99 Lei (ex VAT)
    - button "Products":
        - img
        - text: Products
    - button "Open notifications":
        - button "Open notifications":
            - img
            - text: Notifications
    - button "Open my account":
        - img
        - text: My Account
- main:
    - navigation "Product categories":
        - button "Semiconductors 2 items"
        - button "Passives 1 item"
        - button "Connectors 0 items"
    - region "Source electronic components with confidence":
        - paragraph: ECAS procurement demo
        - heading "Source electronic components with confidence" [level=1]
        - paragraph: Review stock, compare part details, and move from product discovery to checkout in a clearer B2B buying flow.
        - link "Explore Products":
            - /url: /search
    - img
    - text: Over 10,000 products Available online
    - img
    - text: Fast and Secure Delivery Reliable Couriers
    - img
    - text: Research and Development Software & Hardware
    - img
    - text: Skilled Customer Support Available online & on phone
    - heading "Featured Products" [level=2]
    - paragraph:
        - button "Featured"
    - paragraph:
        - button "Best Sellers"
    - paragraph:
        - button "Hot Deals"
    - paragraph:
        - button "Top Searched"
    - img "Electronic component kit"
    - paragraph: Contract pricing
    - text: Volume rates on in-stock lines
    - paragraph: Qualifying quantities unlock better unit pricing on semiconductors, passives, and connectors — without leaving the catalog.
    - link "Review tiers":
        - /url: /search
    - group "1 / 2":
        - link "View STM32F407VGT6 Microcontroller":
            - /url: /product/stm32f407vgt6
        - img
        - text: 150 in stock
        - img "STM32F407VGT6 Microcontroller"
        - heading "STM32F407VGT6 Microcontroller" [level=3]
        - heading "Category" [level=4]
        - paragraph: 32-bit ARM Cortex-M4 MCU with FPU, 1 MB Flash, and rich peripheral set for industrial control.
        - strong: 959.99 Lei
        - text: (1+)
        - button "Add STM32F407VGT6 Microcontroller to cart":
            - img
            - text: Add STM32F407VGT6 Microcontroller to cart
        - link "View ADM2587E RS-485 Transceiver":
            - /url: /product/adm2587e
        - img
        - text: 75 in stock
        - img "ADM2587E RS-485 Transceiver"
        - heading "ADM2587E RS-485 Transceiver" [level=3]
        - heading "Category" [level=4]
        - paragraph: Isolated RS-485 transceiver with integrated power and signal isolation for industrial fieldbus.
        - strong: 1449.99 Lei
        - text: (1+)
        - button "Add ADM2587E RS-485 Transceiver to cart":
            - img
            - text: Add ADM2587E RS-485 Transceiver to cart
        - link "View BAT54C Schottky Diode":
            - /url: /product/bat54c
        - img
        - text: 500 in stock
        - img "BAT54C Schottky Diode"
        - heading "BAT54C Schottky Diode" [level=3]
        - heading "Category" [level=4]
        - paragraph: Dual Schottky barrier diode in SOT-23 for high-speed switching and reverse-polarity protection.
        - strong: 139.99 Lei
        - text: (1+)
        - button "Add BAT54C Schottky Diode to cart":
            - img
            - text: Add BAT54C Schottky Diode to cart
        - link "View Wireless Noise-Canceling Headphones":
            - /url: /product/headphones-nc-wireless
        - img
        - text: 200 in stock
        - img "Wireless Noise-Canceling Headphones"
        - heading "Wireless Noise-Canceling Headphones" [level=3]
        - heading "Category" [level=4]
        - paragraph: High-quality wireless headphones with active noise cancellation.
        - strong: 279.99 Lei
        - text: (1+)
        - button "Add Wireless Noise-Canceling Headphones to cart":
            - img
            - text: Add Wireless Noise-Canceling Headphones to cart
        - link "View Bluetooth Speaker Portable":
            - /url: /product/speaker-bluetooth-portable
        - img
        - text: 350 in stock
        - img "Bluetooth Speaker Portable"
        - heading "Bluetooth Speaker Portable" [level=3]
        - heading "Category" [level=4]
        - paragraph: Portable Bluetooth speaker with powerful sound and long battery life.
        - strong: 69.99 Lei
        - text: (1+)
        - button "Add Bluetooth Speaker Portable to cart":
            - img
            - text: Add Bluetooth Speaker Portable to cart
    - group "2 / 2":
        - link "View Premium Tablet Pro":
            - /url: /product/tablet-premium-pro
        - img
        - text: 120 in stock
        - img "Premium Tablet Pro"
        - heading "Premium Tablet Pro" [level=3]
        - heading "Category" [level=4]
        - paragraph: High-end tablet with stunning display and powerful performance.
        - strong: 759.99 Lei
        - text: (1+)
        - button "Add Premium Tablet Pro to cart":
            - img
            - text: Add Premium Tablet Pro to cart
        - link "View Gaming Mouse Wireless":
            - /url: /product/mouse-gaming-wireless
        - img
        - text: 450 in stock
        - img "Gaming Mouse Wireless"
        - heading "Gaming Mouse Wireless" [level=3]
        - heading "Category" [level=4]
        - paragraph: High-precision wireless gaming mouse with customizable RGB.
        - strong: 69.99 Lei
        - text: (1+)
        - button "Add Gaming Mouse Wireless to cart":
            - img
            - text: Add Gaming Mouse Wireless to cart
        - link "View Smart Watch Pro":
            - /url: /product/smartwatch-pro
        - img
        - text: 180 in stock
        - img "Smart Watch Pro"
        - heading "Smart Watch Pro" [level=3]
        - heading "Category" [level=4]
        - paragraph: Advanced smartwatch with health monitoring and GPS.
        - strong: 379.99 Lei
        - text: (1+)
        - button "Add Smart Watch Pro to cart":
            - img
            - text: Add Smart Watch Pro to cart
    - button "Go to slide 1"
    - button "Go to slide 2"
    - img
    - paragraph: Procurement highlight
    - heading "Stock visibility for urgent sourcing" [level=2]
    - img "Banner"
    - img "Background"
    - img
    - heading "Quick Buy" [level=2]
    - paragraph: Are you in a hurry? Use the Quick Buy feature!
    - button "Add to cart":
        - img
        - text: Add to cart
    - group "1 / 2":
        - heading "Built for modern B2B procurement" [level=3]
        - paragraph: Compare parts, confirm availability, and move from shortlist to checkout with a cleaner reviewer-friendly flow.
        - button "View More"
        - img "Img"
        - img "Background"
    - group "2 / 2":
        - heading "Volume pricing, real-time stock" [level=3]
        - paragraph: Access tiered pricing and live inventory data across thousands of electronic components from leading manufacturers.
        - button "View More"
        - img "Img"
        - img "Background"
    - button "Go to slide 1"
    - button "Go to slide 2"
    - text: New Products
    - group "1 / 2":
        - link "View 4K Ultra HD Monitor":
            - /url: /product/monitor-4k-ultra
        - img
        - text: 95 in stock
        - img "4K Ultra HD Monitor"
        - heading "4K Ultra HD Monitor" [level=3]
        - heading "Category" [level=4]
        - paragraph: Professional-grade 4K monitor with HDR and color accuracy.
        - strong: 649.99 Lei
        - text: (1+)
        - button "Add 4K Ultra HD Monitor to cart":
            - img
            - text: Add 4K Ultra HD Monitor to cart
        - link "View Cordless Power Drill":
            - /url: /product/drill-cordless-power
        - img
        - text: 220 in stock
        - img "Cordless Power Drill"
        - heading "Cordless Power Drill" [level=3]
        - heading "Category" [level=4]
        - paragraph: Professional-grade cordless drill with brushless motor.
        - strong: 119.99 Lei
        - text: (1+)
        - button "Add Cordless Power Drill to cart":
            - img
            - text: Add Cordless Power Drill to cart
        - link "View USB-C Charging Cable":
            - /url: /product/cable-usb-c-charging
        - img
        - text: 800 in stock
        - img "USB-C Charging Cable"
        - heading "USB-C Charging Cable" [level=3]
        - heading "Category" [level=4]
        - paragraph: Fast-charging USB-C cable with braided construction.
        - strong: 14.99 Lei
        - text: (1+)
        - button "Add USB-C Charging Cable to cart":
            - img
            - text: Add USB-C Charging Cable to cart
        - link "View Mirrorless Camera Pro":
            - /url: /product/camera-mirrorless-pro
        - img
        - text: 85 in stock
        - img "Mirrorless Camera Pro"
        - heading "Mirrorless Camera Pro" [level=3]
        - heading "Category" [level=4]
        - paragraph: Professional mirrorless camera with advanced autofocus.
        - strong: 1799.99 Lei
        - text: (1+)
        - button "Add Mirrorless Camera Pro to cart":
            - img
            - text: Add Mirrorless Camera Pro to cart
        - link "View Circular Saw":
            - /url: /product/saw-circular-power
        - img
        - text: 160 in stock
        - img "Circular Saw"
        - heading "Circular Saw" [level=3]
        - heading "Category" [level=4]
        - paragraph: Heavy-duty circular saw for professional carpentry.
        - strong: 139.99 Lei
        - text: (1+)
        - button "Add Circular Saw to cart":
            - img
            - text: Add Circular Saw to cart
        - link "View Laptop Backpack":
            - /url: /product/backpack-laptop-pro
        - img
        - text: 380 in stock
        - img "Laptop Backpack"
        - heading "Laptop Backpack" [level=3]
        - heading "Category" [level=4]
        - paragraph: Water-resistant backpack with laptop compartment and USB port.
        - strong: 49.99 Lei
        - text: (1+)
        - button "Add Laptop Backpack to cart":
            - img
            - text: Add Laptop Backpack to cart
    - group "2 / 2":
        - link "View Wireless Earbuds Pro":
            - /url: /product/earbuds-wireless-pro
        - img
        - text: 350 in stock
        - img "Wireless Earbuds Pro"
        - heading "Wireless Earbuds Pro" [level=3]
        - heading "Category" [level=4]
        - paragraph: Premium wireless earbuds with ANC and transparency mode.
        - strong: 179.99 Lei
        - text: (1+)
        - button "Add Wireless Earbuds Pro to cart":
            - img
            - text: Add Wireless Earbuds Pro to cart
        - link "View LED Desk Lamp":
            - /url: /product/lamp-desk-led
        - img
        - text: 420 in stock
        - img "LED Desk Lamp"
        - heading "LED Desk Lamp" [level=3]
        - heading "Category" [level=4]
        - paragraph: Adjustable LED desk lamp with multiple brightness levels.
        - strong: 34.99 Lei
        - text: (1+)
        - button "Add LED Desk Lamp to cart":
            - img
            - text: Add LED Desk Lamp to cart
    - button "Go to slide 1"
    - button "Go to slide 2"
    - heading "News" [level=2]
    - group "1 / 4":
        - link "Cover Nexperia launches hot-swap application-specific MOSFETs (ASFE) 29 OCT 2024":
            - /url: /
            - img "Cover"
            - heading "Nexperia launches hot-swap application-specific MOSFETs (ASFE)" [level=3]
            - text: 29 OCT 2024
    - group "2 / 4":
        - link "Cover Analog Devices expands allocation for industrial interface ICs 12 OCT 2024":
            - /url: /
            - img "Cover"
            - heading "Analog Devices expands allocation for industrial interface ICs" [level=3]
            - text: 12 OCT 2024
    - group "3 / 4":
        - link "Cover Passives lead times stabilize across high-volume MLCC lines 03 OCT 2024":
            - /url: /
            - img "Cover"
            - heading "Passives lead times stabilize across high-volume MLCC lines" [level=3]
            - text: 03 OCT 2024
    - group "4 / 4":
        - link "Cover USB-C receptacles now qualified for extended temperature ranges 18 SEP 2024":
            - /url: /
            - img "Cover"
            - heading "USB-C receptacles now qualified for extended temperature ranges" [level=3]
            - text: 18 SEP 2024
    - heading "Top Manufacturers" [level=2]
    - group "1 / 7":
        - img "Logo"
    - group "2 / 7":
        - img "Logo"
    - group "3 / 7":
        - img "Logo"
    - group "4 / 7":
        - img "Logo"
    - group "5 / 7":
        - img "Logo"
    - group "6 / 7":
        - img "Logo"
    - group "7 / 7":
        - img "Logo"
    - link "View all manufacturers":
        - /url: /
- contentinfo:
    - link:
        - /url: /
        - img: DEMO
    - paragraph: Self-contained portfolio demo. No external services or social accounts required.
    - text: Storefront
    - list:
        - listitem:
            - link "Home":
                - /url: /
        - listitem:
            - link "Browse products":
                - /url: /search
        - listitem:
            - link "View cart":
                - /url: /cart
    - text: Review flows
    - list:
        - listitem:
            - link "Track Order":
                - /url: /order-tracking
        - listitem:
            - link "Order History":
                - /url: /dashboard/client?tab=orders
    - paragraph: © 2026 ECAS
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
> 18 |   await expect(page).toHaveURL(/\/dashboard\/orders$/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  19 | };
  20 |
  21 | test.describe('Admin Smoke Path', () => {
  22 |   test('admin preview can load orders, customers, and a customer control panel', async ({ page }) => {
  23 |     const runtimeErrors: string[] = [];
  24 |     page.on('pageerror', (error) => runtimeErrors.push(error.message));
  25 |     page.on('console', (message) => {
  26 |       if (message.type() === 'error' || message.type() === 'warning') runtimeErrors.push(message.text());
  27 |     });
  28 |
  29 |     await signInAsAdmin(page);
  30 |     runtimeErrors.length = 0;
  31 |
  32 |     await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  33 |     await expect(page.getByRole('link', { name: /ORD-2024-0001/i }).first()).toBeVisible();
  34 |
  35 |     await Promise.all([page.waitForURL(/\/dashboard\/customers$/), page.locator('a[href="/dashboard/customers"]').click()]);
  36 |     await expect(page).toHaveURL(/\/dashboard\/customers$/);
  37 |     await expect(page.getByText(/customers by country/i)).toBeVisible();
  38 |     await expect(page.getByText(/customers list/i)).toBeVisible();
  39 |     await expect(page.getByText(/john smith/i).first()).toBeVisible();
  40 |
  41 |     await page.goto('/dashboard/customers/customer-001/control-panel/account', { waitUntil: 'domcontentloaded' });
  42 |     await expect(page).toHaveURL(/\/dashboard\/customers\/customer-001\/control-panel\/account$/);
  43 |     await expect(page.getByText(/credit limit/i).first()).toBeVisible();
  44 |     await expect(page.getByText(/available credit/i).first()).toBeVisible();
  45 |     await expect(page.getByRole('heading', { name: /account details/i })).toBeVisible();
  46 |     await expect(page.locator('input[value="John"]').first()).toBeVisible();
  47 |     expect(runtimeErrors).toEqual([]);
  48 |   });
  49 | });
  50 |
```
