import { test, expect } from '@playwright/test';
import { ensureAdminSession } from './helpers/auth';

test.describe('Backoffice v2 — matières & prix', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test('/administration/backoffice?tab=materials — hubs + tableau matières', async ({ page }) => {
    await page.goto('/administration/backoffice?tab=materials', { waitUntil: 'domcontentloaded' });

    await expect(page.getByLabel('Navigation Administration').first()).toBeVisible({
      timeout: 60_000,
    });

    await expect(page.locator('.ab2-topbar-title, .ab2-module-tabs').first()).toBeVisible({
      timeout: 30_000,
    });

    await expect(
      page.getByRole('button', { name: /Matières/i }).first(),
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.locator('body')).toContainText(/matière|prix de base|publication/i, {
      timeout: 90_000,
    });
  });

  test('sidebar administration — accordéon Stock & Matières', async ({ page }) => {
    await page.goto('/administration/backoffice?tab=overview', { waitUntil: 'domcontentloaded' });

    const adminNav = page.locator('.orion-admin-macro-nav').first();
    await expect(adminNav).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: /Stock & Matières/i }).click();
    await adminNav.getByRole('link', { name: /^Matières$/i }).click();
    await page.waitForURL('**/administration/backoffice?tab=materials**', { timeout: 30_000 });
    await expect(page).toHaveURL(/tab=materials/);
  });
});
