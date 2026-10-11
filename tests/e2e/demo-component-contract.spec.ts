import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`category SVG preview is reachable in Create and Edit at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    const warnings: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
      if (message.type() === 'warning') warnings.push(message.text());
    });
    page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}`));
    page.on('response', (response) => {
      if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
    });

    const login = await page.request.post('/api/auth/login', {
      data: { email: 'admin@demo.com', password: 'admin123' },
    });
    expect(login.ok()).toBe(true);
    const { token } = (await login.json()) as { token: string };
    const baseURL = testInfo.project.use.baseURL as string;
    await page.context().addCookies([{ name: 'token', value: token, domain: new URL(baseURL).hostname, path: '/' }]);
    await page.goto('/dashboard/products/categories', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Categories', exact: true })).toBeVisible();

    for (const surface of ['create', 'edit'] as const) {
      if (surface === 'create') {
        await page.getByRole('button', { name: '+ Create New', exact: true }).click();
      } else {
        // The existing row pencil is an unnamed icon button; identify its actual SVG.
        await page.locator('button:has(svg.lucide-pencil-line)').first().click();
      }
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: surface === 'create' ? 'Create Category' : 'Edit Category' })).toBeVisible();
      const upload = dialog.getByRole('button', { name: 'Upload SVG icon', exact: true });
      await expect(upload).toBeVisible();
      const preview = dialog.locator('div.w-12.h-12 svg');
      await expect(preview).toHaveCount(0);
      const emptyPath = testInfo.outputPath(`${surface}-empty.png`);
      await dialog.screenshot({ path: emptyPath });
      await testInfo.attach(`${surface}-empty.png`, { path: emptyPath, contentType: 'image/png' });

      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), upload.click()]);
      await chooser.setFiles({
        name: 'demo-icon.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="window.__unsafeSvg=true"><script>window.__unsafeSvg=true</script><circle cx="12" cy="12" r="8" fill="#007fff" /></svg>',
        ),
      });
      await expect(preview).toBeVisible();
      await expect(preview).toHaveAttribute('width', '20');
      await expect(preview).toHaveAttribute('height', '20');
      await expect(preview.locator('circle')).toHaveCount(1);
      await expect(preview.locator('script')).toHaveCount(0);
      expect(await preview.getAttribute('onload')).toBeNull();
      expect(await page.evaluate(() => '__unsafeSvg' in window)).toBe(false);
      const uploadedPath = testInfo.outputPath(`${surface}-uploaded.png`);
      await dialog.screenshot({ path: uploadedPath });
      await testInfo.attach(`${surface}-uploaded.png`, { path: uploadedPath, contentType: 'image/png' });
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }

    const runtimePath = testInfo.outputPath('runtime.json');
    await writeFile(
      runtimePath,
      JSON.stringify({ route: '/dashboard/products/categories', viewport, errors, warnings, failedRequests }, null, 2),
    );
    await testInfo.attach('runtime.json', { path: runtimePath, contentType: 'application/json' });
    expect(errors).toEqual([]);
    expect(warnings.filter((warning) => /hydration/i.test(warning))).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
