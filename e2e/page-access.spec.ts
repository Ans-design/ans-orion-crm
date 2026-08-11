import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsDemo } from './helpers/auth';

test.describe('Contrôle accès pages (middleware + layout)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('sans session — /dashboard redirige vers login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });

  test('compte démo — /rh/paie redirige vers non-autorise', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/rh/paie');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /accès non autorisé/i })).toBeVisible();
  });

  test('admin — /rh/paie accessible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/rh/paie');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { level: 1, name: /paie/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('compte démo — /commandes reste accessible', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/commandes');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1, name: /commandes/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
