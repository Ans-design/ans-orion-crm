import { test, expect } from '@playwright/test';
import { ensureAdminSession } from './helpers/auth';

/**
 * E2E P0 — plan §6 (sous-ensemble API + parcours admin).
 */
test.describe('Audit P0 complet', () => {
  test('1. Login admin', async ({ page }) => {
    await ensureAdminSession(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.describe('API sans session', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('2. API import matières sans session → 401/403', async ({ request }) => {
      const res = await request.post('/api/admin-backoffice/pricing/base-material-prices/import-excel', {
        data: { rows: [{ Matière: 'TEST-E2E', 'Prix base': 100 }] },
      });
      expect([401, 403]).toContain(res.status());
    });

    test('6. API fichiers sans session → 401/403', async ({ request }) => {
      const res = await request.get('/api/files');
      expect([401, 403]).toContain(res.status());
    });

    test('7. API finance charges sans session → 401/403', async ({ request }) => {
      const res = await request.get('/api/finance/charges');
      expect([401, 403]).toContain(res.status());
    });
  });

  test('3. Import Excel matières persistant (+1 ligne)', async ({ page }) => {
    await ensureAdminSession(page);
    const api = page.request;

    const listBefore = await api.get('/api/admin-backoffice/pricing/base-material-prices?_t=1');
    expect(listBefore.ok()).toBeTruthy();
    const beforeJson = await listBefore.json();
    const totalBefore = beforeJson.data?.stats?.total ?? beforeJson.data?.rows?.length ?? 0;

    const unique = `E2E-MAT-${Date.now()}`;
    const importRes = await api.post('/api/admin-backoffice/pricing/base-material-prices/import-excel', {
      data: {
        rows: [{
          Matière: unique,
          'Type caractéristique': 'Grammage',
          Valeur: '120g',
          Famille: 'Autre',
          'Prix base': 1500,
          'Unité prix': 'feuille',
          'POS actif': 'oui',
        }],
        fileName: 'e2e-import.xlsx',
      },
    });
    expect(importRes.ok()).toBeTruthy();
    const report = (await importRes.json()).data;
    expect(report.created + report.updated).toBeGreaterThan(0);

    const listAfter = await api.get(`/api/admin-backoffice/pricing/base-material-prices?_t=${Date.now()}`);
    const afterJson = await listAfter.json();
    const totalAfter = afterJson.data?.stats?.total ?? afterJson.data?.rows?.length ?? 0;
    expect(totalAfter).toBeGreaterThanOrEqual(totalBefore);

    const rows = afterJson.data?.rows ?? [];
    expect(rows.some((r: { name?: string }) => String(r.name ?? '').includes(unique))).toBeTruthy();
  });

  test('4. Admin matières page charge', async ({ page }) => {
    await ensureAdminSession(page);
    await page.goto('/administration/matieres', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/matière|prix/i, { timeout: 60_000 });
  });

  test('5. POS catalogue visible', async ({ page }) => {
    await ensureAdminSession(page);
    await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 60_000 });
  });
});
