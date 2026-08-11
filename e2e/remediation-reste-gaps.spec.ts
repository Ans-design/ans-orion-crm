import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Remédiation reste — inventaire / CM / plan matière', () => {
  test.describe.configure({ timeout: 120_000 });

  test('admin — onglet inventaire physique stock', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/stock?tab=inventaire');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { name: /inventaire physique/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('admin — plan matière deep-link commande query acceptée', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/production/dechets');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { level: 1, name: /plan matière|déchets/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('admin — CM notifications accepte ?commande=', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/cm/notifications?commande=demo-cmd');
    await expect(page).not.toHaveURL(/\/non-autorise/);
    await expect(page.getByRole('heading', { level: 1, name: /notifications/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
