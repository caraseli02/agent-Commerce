import { expect, test } from '@playwright/test';
import { disableMotion, expectCleanRuntime, signInAsAdmin, signInAsCustomer, visit } from '../playwright-support/runtime';

for (const surface of ['storefront', 'admin'] as const) {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    test(`${surface} notification controls at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await disableMotion(page);
      const notifications = ['New', 'Completed', 'Pending', 'Removed'].map((title, index) => ({
        id: `notification-${index}`,
        title,
        description: `Notification ${index + 1}: your account update is ready to review.`,
        seen: false,
        details: {},
        date: new Date(Date.UTC(2026, 9, 14, 12 - index)).toISOString(),
        group: index % 3,
      }));
      const mutations: string[] = [];
      await page.route('**/api/notification{,/**}', async (route) => {
        const request = route.request();
        const method = request.method();
        if (method !== 'GET') mutations.push(`${method} ${new URL(request.url()).pathname}`);
        await route.fulfill({
          json: method === 'GET' ? { status: 'success', description: notifications } : { status: 'success' },
        });
      });

      const signals = surface === 'admin' ? await signInAsAdmin(page) : await signInAsCustomer(page);
      if (surface === 'storefront') {
        expectCleanRuntime(signals, 'customer sign-in');
        const homeSignals = await visit(page, '/');
        expectCleanRuntime(homeSignals, '/');
      }
      if (surface === 'storefront' && viewport.width < 768) {
        await page.getByRole('button', { name: 'Open my account', exact: true }).click();
        await page.getByRole('button', { name: /^Notifications/ }).click();
      } else {
        await page.getByRole('button', { name: 'Open notifications', exact: true }).click();
      }
      const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Notifications', exact: true }) });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Delete notification', exact: true })).toHaveCount(4);
      await dialog.screenshot({ path: testInfo.outputPath('notifications-initial.png') });
      // Invalid nesting must not return when either control changes later.
      await expect(dialog.locator('a button, button button, button a')).toHaveCount(0);
      const originalUrl = page.url();
      const markNew = dialog.getByRole('button', { name: 'Mark notification as read: New', exact: true });
      const markCompleted = dialog.getByRole('button', { name: 'Mark notification as read: Completed', exact: true });
      const newRow = markNew.locator('..');
      const completedRow = markCompleted.locator('..');
      const newDelete = newRow.getByRole('button', { name: 'Delete notification', exact: true });
      await expect(markNew).toBeVisible();
      const markBounds = await markNew.boundingBox();
      const deleteBounds = await newDelete.boundingBox();
      expect(markBounds && deleteBounds && deleteBounds.x >= markBounds.x).toBeTruthy();
      expect(deleteBounds && deleteBounds.x + deleteBounds.width).toBeLessThanOrEqual(viewport.width);

      const titleBounds = await markNew.getByText('New', { exact: true }).boundingBox();
      expect(titleBounds).not.toBeNull();
      expect(deleteBounds).not.toBeNull();
      expect(Math.abs(titleBounds!.y + titleBounds!.height / 2 - (deleteBounds!.y + deleteBounds!.height / 2))).toBeLessThanOrEqual(1);

      await markNew.focus();
      await page.keyboard.press('Tab');
      await expect(newDelete).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(markNew).toBeFocused();
      await page.keyboard.press('Enter');
      await expect.poll(() => mutations.slice()).toEqual(['PUT /api/notification/notification-0']);
      await expect(newRow.locator('.bg-blue-500')).toHaveCount(0);
      await expect(newDelete).toBeVisible();
      await markCompleted.press('Space');
      await expect.poll(() => mutations.slice()).toEqual(['PUT /api/notification/notification-0', 'PUT /api/notification/notification-1']);
      await expect(completedRow.locator('.bg-blue-500')).toHaveCount(0);

      const markPending = dialog.getByRole('button', { name: 'Mark notification as read: Pending', exact: true });
      await markPending.getByText('Notification 3:', { exact: false }).click();
      await expect.poll(() => mutations.length).toBe(3);
      expect(mutations[2]).toBe('PUT /api/notification/notification-2');
      // Deleting an unread row must never also mark it read.
      await dialog
        .getByRole('button', { name: 'Mark notification as read: Removed', exact: true })
        .locator('..')
        .getByRole('button', { name: 'Delete notification', exact: true })
        .click();
      await expect.poll(() => mutations.length).toBe(4);
      expect(mutations[3]).toBe('DELETE /api/notification/notification-3');
      await expect(dialog.getByText(notifications[3].description, { exact: true })).toHaveCount(0);
      await newDelete.press('Space');
      await expect.poll(() => mutations.length).toBe(5);
      expect(mutations[4]).toBe('DELETE /api/notification/notification-0');
      await expect(markNew).toHaveCount(0);
      await completedRow.getByRole('button', { name: 'Delete notification', exact: true }).press('Enter');
      await expect.poll(() => mutations.length).toBe(6);
      expect(mutations[5]).toBe('DELETE /api/notification/notification-1');
      await expect(markCompleted).toHaveCount(0);
      expect(page.url()).toBe(originalUrl);
      await expect(dialog).toBeVisible();
      await dialog.screenshot({ path: testInfo.outputPath('notifications-after-actions.png') });
      expectCleanRuntime(signals, `${surface} notification controls`);
    });
  }
}
