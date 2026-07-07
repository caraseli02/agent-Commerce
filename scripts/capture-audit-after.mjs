import { chromium, request as playwrightRequest } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('docs/audit-screenshots/after');
const baseUrl = 'http://localhost:3005';

const desktopCaptures = [
  {
    file: 'search-keyword-stm32.png',
    url: '/search?keyword=stm32',
    waitFor: 'text=STM32F407VGT6 Microcontroller',
  },
  {
    file: 'product-detail-prod-1.png',
    url: '/product/prod-1',
    waitFor: 'text=STM32F407VGT6 Microcontroller',
  },
  {
    file: 'order-summary-guest.png',
    url: '/order-summary',
    waitFor: 'text=Order Summary',
  },
  {
    file: 'checkout-session-disabled.png',
    url: '/checkout/session',
    waitFor: 'text=Stripe checkout disabled in demo',
    requiresAuth: true,
  },
];

const mobileCaptures = [
  {
    file: 'mobile-home-390.png',
    url: '/',
    waitFor: 'text=Electronic Components',
  },
  {
    file: 'mobile-order-summary-390.png',
    url: '/order-summary',
    waitFor: 'text=Order Summary',
  },
];

async function loginAsCustomer() {
  const request = await playwrightRequest.newContext({ baseURL: baseUrl });
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'customer@demo.com',
      password: 'customer123',
    },
  });
  const json = await response.json();
  const token = json.token || json.data?.token;

  if (!token) {
    throw new Error('Failed to obtain mock auth token for screenshot capture');
  }

  await request.dispose();
  return token;
}

async function withAuthCookies(context, token) {
  await context.addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const authToken = await loginAsCustomer();

async function takeScreenshot(page, shot) {
  await page.goto(`${baseUrl}${shot.url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => undefined);
  await page.waitForSelector(shot.waitFor, { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outDir, shot.file),
    fullPage: true,
  });
  console.log(`saved ${shot.file}`);
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await withAuthCookies(desktop, authToken);
const desktopPage = await desktop.newPage();

for (const shot of desktopCaptures) {
  await takeScreenshot(desktopPage, shot);
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobile.newPage();

for (const shot of mobileCaptures) {
  await takeScreenshot(mobilePage, shot);
}

await browser.close();
