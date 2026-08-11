import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  loginAsCommercial,
  loginAsDemo,
} from './helpers/auth';

test.describe('Sidebar — gate Administration (V3)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('admin — univers Administration visible dans la sidebar', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    const sidebar = page.getByRole('complementary', { name: /navigation principale/i });
    await expect(sidebar).toBeVisible({ timeout: 20_000 });
    // Classe stable — le badge live peut enrichir le nom accessible
    await expect(sidebar.locator('button.orion-sb-universe-btn', { hasText: 'Administration' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('commercial COM01 — pas de bouton Administration dans la sidebar', async ({ page }) => {
    await loginAsCommercial(page);
    await page.goto('/dashboard');
    const sidebar = page.getByRole('complementary', { name: /navigation principale/i });
    await expect(sidebar).toBeVisible({ timeout: 20_000 });
    await expect(sidebar.locator('button.orion-sb-universe-btn', { hasText: 'Administration' })).toHaveCount(0);
    await expect(sidebar.getByRole('navigation', { name: /modules administration/i })).toHaveCount(0);
  });

  test('compte démo — pas de bouton Administration (non admin/manager)', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/dashboard');
    const sidebar = page.getByRole('complementary', { name: /navigation principale/i });
    await expect(sidebar).toBeVisible({ timeout: 20_000 });
    await expect(sidebar.locator('button.orion-sb-universe-btn', { hasText: 'Administration' })).toHaveCount(0);
  });

  test('commercial — URL directe /administration refusée', async ({ page }) => {
    await loginAsCommercial(page);
    await page.goto('/administration/vue-ensemble');
    await expect(page).toHaveURL(/\/non-autorise/, { timeout: 20_000 });
  });

  test('commercial — flow Commercial numéroté sans trou (5 étapes)', async ({ page }) => {
    await loginAsCommercial(page);
    await page.goto('/dashboard');
    const sidebar = page.getByRole('complementary', { name: /navigation principale/i });
    await sidebar.getByRole('button', { name: /^Commercial/i }).click();
    const steps = sidebar.locator('.orion-sb-flow-step');
    await expect(steps).toHaveCount(5);
    await expect(steps.first()).toHaveText('1');
    await expect(steps.last()).toHaveText('5');
    // Lien module Réclamations (pas un texte générique ailleurs dans la sidebar)
    await expect(
      sidebar.locator('button.orion-sb-sub-link', { hasText: /réclamations/i }),
    ).toHaveCount(0);
  });
});
