import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { fetchApi, openAdminControl } from './helpers/admin';

async function fetchJson(page: import('@playwright/test').Page, path: string, init?: RequestInit) {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, { credentials: 'same-origin', ...init });
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    { path, init },
  );
}

test.describe('Parcours fusion — Admin Control & APIs', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Admin Control — chargement + APIs fusion materials / PRIX 2026', async ({ page }) => {
    await openAdminControl(page);

    const statusRes = await fetchApi(page, '/api/fusion/status');
    expect([200, 503]).toContain(statusRes.status);
    if (statusRes.status === 200) {
      expect((statusRes.body as { ok?: boolean }).ok).toBe(true);
    }

    const materialsRes = await fetchApi(page, '/api/fusion/materials');
    expect(materialsRes.status).toBe(200);
    const materials = (materialsRes.body as { materials?: unknown[] }).materials;
    expect(Array.isArray(materials)).toBe(true);

    const pricesRes = await fetchApi(page, '/api/fusion/sale-prices?limit=5');
    expect(pricesRes.status).toBe(200);
    const items = (pricesRes.body as { items?: unknown[] }).items;
    expect(Array.isArray(items)).toBe(true);
  });

  test('API fusion/status + materials-catalog', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const statusRes = await fetchApi(page, '/api/fusion/status');
    expect([200, 503]).toContain(statusRes.status);

    const catalogRes = await fetchApi(page, '/api/materials-catalog');
    expect(catalogRes.status).toBe(200);
    expect(Array.isArray((catalogRes.body as { materials?: unknown[] }).materials)).toBe(true);
  });

  test('API pricing/simulate — prix flyer (admin)', async ({ page }) => {
    await page.goto('/dashboard');
    const { status, body } = await fetchJson(page, '/api/pricing/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: 'fly-std',
        config: {
          format: 'A6 — 105×148 mm',
          paperType: 'Offset',
          paperWeight: '80g',
          face: 'Recto-verso',
          qty: 500,
        },
        qty: 500,
      }),
    });
    expect(status).toBe(200);
    expect(body.prixUnitaire).toBeGreaterThan(0);
    expect(body.totalHT).toBeGreaterThan(0);
  });
});
