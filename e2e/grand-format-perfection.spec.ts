import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { openDashboardWithCharts } from './helpers/fixtures';

test.describe('Grand Format — cockpit drill-down', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('top articles → commandes avec recherche pré-remplie', async ({ page }) => {
    await openDashboardWithCharts(page);

    const chartTitle = page.getByText(/top articles commandés/i);
    await chartTitle.scrollIntoViewIfNeeded();
    await expect(chartTitle).toBeVisible({ timeout: 20_000 });

    const bar = page.locator('.recharts-bar-rectangle').first();
    await expect(bar).toBeVisible({ timeout: 25_000 });

    await bar.click();
    await page.waitForURL(/\/commandes(\?|$)/, { timeout: 15_000 });

    const search = page.getByPlaceholder(/rechercher commande/i);
    await expect(search).toBeVisible();
    await expect(search).not.toHaveValue('');
  });

  test('machines par état → filtre statut pré-appliqué', async ({ page }) => {
    await openDashboardWithCharts(page);

    const chartTitle = page.getByText(/machines par état/i);
    await chartTitle.scrollIntoViewIfNeeded();
    await expect(chartTitle).toBeVisible({ timeout: 20_000 });

    const legendBtn = page
      .getByRole('button')
      .filter({ hasText: /disponible|en production|maintenance/i })
      .first();
    await expect(legendBtn).toBeVisible({ timeout: 25_000 });

    await legendBtn.click();
    await page.waitForURL(/\/machines(\?|$)/, { timeout: 15_000 });

    const statusSelect = page.locator('select').filter({ hasText: /tous statuts|disponible|production/i });
    await expect(statusSelect).toBeVisible();
    const value = await statusSelect.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });
});

test.describe('Grand Format — POS bâche', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('configurateur démarre vide et bloque ajout panier', async ({ page }) => {
    await page.goto('/pos/gf-bache');
    await expect(page.getByRole('heading', { name: /bâche/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/0\/\d/)).toBeVisible();
    await expect(page.getByRole('button', { name: /ajouter au panier/i })).toBeDisabled();
  });

  test('œillets demandent les dimensions client', async ({ page }) => {
    await page.goto('/pos/gf-bache');
    await expect(page.getByRole('heading', { name: /bâche/i })).toBeVisible({ timeout: 20_000 });

    const eyeletsHint = page.getByText(/dimensions requises/i);
    await eyeletsHint.scrollIntoViewIfNeeded();
    await expect(eyeletsHint).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/renseignez d'abord la longueur/i)).toBeVisible();
  });

  test('récap technique visible après sélection type', async ({ page }) => {
    await page.goto('/pos/gf-bache');
    await page.getByRole('button', { name: 'Bâche PVC standard', exact: true }).click();
    await expect(page.getByText(/récapitulatif technique/i)).toBeVisible({ timeout: 10_000 });
  });
});
