import { test, expect } from '@playwright/test';
import { ensureAdminSession } from './helpers/auth';

/**
 * Smoke audit Sprint 1 — Stock & Matières + POS prix manquant.
 */
test.describe('Audit smoke — matières & POS prix', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test('Administration Stock & Matières charge le tableau', async ({ page }) => {
    await page.goto('/administration/matieres', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('body')).toContainText(/matière|prix|stock/i, { timeout: 60_000 });
  });

  test('POS catalogue affiche des cartes (prix ou à configurer)', async ({ page }) => {
    await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 60_000 });
    const card = page.locator('.group.bg-card, [class*="cursor-pointer"]').first();
    await expect(card).toBeVisible({ timeout: 60_000 });
  });

  test.describe('API sans session', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('API import matières répond 401 sans session', async ({ request }) => {
      const res = await request.post('/api/admin-backoffice/pricing/base-material-prices/import-excel', {
        data: { rows: [{ Matière: 'TEST', 'Prix base': 1 }] },
      });
      expect([401, 403]).toContain(res.status());
    });
  });
});
