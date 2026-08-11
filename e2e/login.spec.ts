import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('affiche la page connexion', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
    await expect(page.getByPlaceholder('email@exemple.com')).toBeVisible();
  });

  test('refuse identifiants invalides', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('email@exemple.com').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('connecte admin et redirige dashboard', async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E_EMAIL et E2E_PASSWORD requis');
    await page.goto('/login');
    await page.getByPlaceholder('email@exemple.com').fill(process.env.E2E_EMAIL!);
    await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /cockpit principal/i })).toBeVisible({ timeout: 15_000 });
  });
});
