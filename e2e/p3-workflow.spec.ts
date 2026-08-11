import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { ensureClientListRow } from './helpers/fixtures';

test.describe('P3 — Clients & Production', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('route /clients/[id] affiche la fiche client', async ({ page }) => {
    const firstRow = await ensureClientListRow(page);
    await firstRow.click();
    await page.waitForURL(/\/clients\/[^/?]+$/, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: /retour à la liste/i })).toBeVisible();
  });

  test('production — vue atelier 10 colonnes', async ({ page }) => {
    await page.goto('/production');
    await expect(page.getByText(/production & atelier/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /vue atelier 10 colonnes/i }).click();
    await expect(page.getByText(/nouvelle commande/i)).toBeVisible();
    await expect(page.getByText(/contrôle qualité/i)).toBeVisible();
    await expect(page.getByText(/prêt livraison/i)).toBeVisible();
  });

  test('POS preview brouillon — bannière visible', async ({ page }) => {
    await page.goto('/pos?preview=draft&role=commercial');
    await expect(page.getByText(/mode preview/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/catalogue pos/i)).toBeVisible();
  });

  test('dashboard — KPIs cliquables', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/tableau de bord/i)).toBeVisible({ timeout: 15_000 });
    await page.getByText(/devis en attente/i).click();
    await page.waitForURL('**/devis**', { timeout: 15_000 });
  });
});
