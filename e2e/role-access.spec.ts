import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  loginAsDemo,
  loginAsCommercial,
  loginAsProduction,
  loginAsCaisse,
  loginAsFinance,
  loginAsLecture,
} from './helpers/auth';

test.describe('Matrice rôles — pages finance & POS', () => {
  test.describe.configure({ timeout: 120_000 });

  test('compte démo — /factures accessible (lecture)', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/factures');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { level: 1, name: /factures/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('compte démo — /paiements accessible', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/paiements');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { level: 1, name: /paiements/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('compte démo — /pos accessible', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/pos');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { level: 1, name: /catalogue|point de vente|pos/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('compte démo — /administration bloqué', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/administration');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
  });

  test('admin — /factures + export comptable visibles', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/factures');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('button', { name: /export comptable/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('clients — liste et fiche séparées', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/clients');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { level: 1, name: /crm clients/i })).toBeVisible({
      timeout: 20_000,
    });
    const firstRow = page.locator('.orion-ds-table-wrap tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/clients\/[^/]+/, { timeout: 15_000 });
      await expect(page.getByRole('button', { name: /retour à la liste/i })).toBeVisible();
    }
  });
});

test.describe('Matrice rôles — commercial, production, caisse, lecture', () => {
  test.describe.configure({ timeout: 120_000 });

  test('commercial COM01 — POS et commandes OK, RH paie et admin bloqués', async ({ page }) => {
    await loginAsCommercial(page);
    await page.goto('/pos');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await page.goto('/commandes');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await page.goto('/rh/paie');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
    await page.goto('/administration');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
  });

  test('production OPE01 — atelier OK, factures et POS bloqués', async ({ page }) => {
    await loginAsProduction(page);
    await page.goto('/production');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByText(/production & atelier/i)).toBeVisible({ timeout: 20_000 });
    await page.goto('/factures');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
    await page.goto('/pos');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
  });

  test('caisse CAISSE01 — paiements OK, administration bloquée', async ({ page }) => {
    await loginAsCaisse(page);
    await page.goto('/paiements');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { level: 1, name: /paiements/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.goto('/administration');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
  });

  test('finance FIN01 — factures + export comptable OK', async ({ page }) => {
    await loginAsFinance(page);
    await page.goto('/factures');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('button', { name: /export comptable/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.goto('/finance/fiscalite');
    await expect(page).not.toHaveURL(/\/non-autorise/);
  });

  test('lecture LEC01 — consultation OK, écriture admin bloquée', async ({ page }) => {
    await loginAsLecture(page);
    await page.goto('/commandes');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await page.goto('/factures');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await page.goto('/administration');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
  });
});
