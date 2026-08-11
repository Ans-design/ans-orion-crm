import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { clickSidebarModule } from './helpers/sidebar';

test.describe('Navigation ERP', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('sidebar — modules clés accessibles', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: /navigation principale/i })).toBeVisible();

    const routes = [
      { name: /catalogue pos|pos/i, url: '/pos', universe: /^Commercial$/ },
      { name: /devis/i, url: '/devis', universe: /^Commercial$/ },
      { name: /commandes/i, url: '/commandes', universe: /^Commercial$/ },
      { name: /clients/i, url: '/clients', universe: /^Commercial$/ },
      { name: /stock/i, url: '/stock', universe: /Stock/i },
    ];

    for (const r of routes) {
      await clickSidebarModule(page, r.name, r.universe);
      await page.waitForURL(`**${r.url}`, { timeout: 15_000 });
      await expect(page).toHaveURL(new RegExp(r.url.replace('/', '\\/')));
    }
  });

  test('dashboard affiche des KPIs', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toContainText(/CA|commandes|devis/i, { timeout: 15_000 });
  });
});
