import { test, expect } from '@playwright/test';
import { ensureAdminSession } from './helpers/auth';
import { clickSidebarModule } from './helpers/sidebar';

test.describe('Backoffice & ANS Talk — navigation sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test('sidebar → Backoffice unifié (santé)', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /navigation principale/i });
    await expect(nav).toBeVisible();

    await clickSidebarModule(page, /^backoffice$/i, /^Administration$/);
    await page.waitForURL('**/administration/**', { timeout: 20_000 });
    await expect(page).toHaveURL(/administration\/vue-ensemble/);
    await expect(page.locator('body')).toContainText(/santé|neon|production/i, { timeout: 15_000 });
  });

  test('sidebar → ANS Talk plein écran', async ({ page }) => {
    await clickSidebarModule(page, /ans talk/i, /^Communication$/);
    await page.waitForURL('**/messagerie**', { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(/ANS Talk|Messages/i, { timeout: 15_000 });
    await expect(page.locator('.talk-floating-bubble-btn')).toHaveCount(0);
    await expect(page.locator('.ans-talk-shell')).toBeVisible();
  });

  test('/admin-control redirige vers backoffice unifié', async ({ page }) => {
    await page.goto('/admin-control?tab=chips');
    await page.waitForURL('**/administration/options**', { timeout: 20_000 });
    await expect(page).toHaveURL(/administration\/options/);
  });

  test('/ans-talk redirige vers messagerie', async ({ page }) => {
    await page.goto('/ans-talk');
    await page.waitForURL('**/messagerie**', { timeout: 15_000 });
  });
});
