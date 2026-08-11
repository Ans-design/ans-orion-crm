import { test, expect } from '@playwright/test';

/**
 * Smoke E2E — modules commerciaux stabilisés.
 * Auth via e2e/auth.setup.ts (storageState) — une seule connexion par run.
 */
test.describe('Smoke ORION — modules critiques', () => {
  test.describe.configure({ timeout: 120_000, mode: 'serial' });

  const modules = [
    '/dashboard', '/clients', '/pos', '/panier', '/devis', '/commandes', '/stock',
    '/production', '/machines', '/paiements', '/factures', '/livraisons', '/rapports',
    '/administration/data-management',
  ];

  for (const path of modules) {
    test(`${path} — charge sans erreur serveur`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status() ?? 0).toBeLessThan(500);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
    });
  }

  test('/api/health/ready — readiness OK', async ({ request }) => {
    const res = await request.get('/api/health/ready');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data?.checks?.length).toBeGreaterThan(0);
  });
});
