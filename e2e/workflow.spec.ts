import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Workflow commercial', () => {
  test('login → dashboard → POS → panier', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: /catalogue pos|pos/i }).first().click();
    await page.waitForURL('**/pos', { timeout: 15_000 });
    await expect(page.locator('h1').first()).toContainText(/catalogue/i, { timeout: 15_000 });

    // Grille catégories visible
    await expect(page.locator('button').filter({ hasText: /tous|favoris|top/i }).first()).toBeVisible();

    await page.goto('/panier');
    await expect(page).toHaveURL(/\/panier/);
  });

  test('liste devis charge', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: /devis/i }).first().click();
    await page.waitForURL('**/devis', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /devis/i })).toBeVisible();
  });

  test('rapports admin accessibles', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/rapports');
    await expect(page.getByRole('heading', { name: /rapports/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mois/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible();
  });
});
