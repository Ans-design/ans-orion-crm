import { test, expect } from '@playwright/test';
import { fetchApi } from './helpers/admin';

const isRemote = process.env.E2E_REMOTE === 'true';

test.describe('Prod smoke — Hostinger', () => {
  test.skip(!isRemote, 'Nécessite E2E_REMOTE=true et E2E_BASE_URL');

  test('API health publiques', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
    const body = await health.json();
    expect(body.ok).toBe(true);

    const db = await request.get('/api/health/db');
    expect(db.status()).toBe(200);
    const dbBody = await db.json();
    expect(dbBody.ok).toBe(true);
    expect(dbBody.database).toBe('connected');
  });

  test('redirects administration legacy (sans auth)', async ({ request }) => {
    for (const [from, to] of [
      ['/admin-control?tab=chips', /administration\/options/],
      ['/admin/pricing?tab=matieres', /administration\/matieres/],
    ] as const) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect([301, 302, 307, 308]).toContain(res.status());
      const location = res.headers().location ?? '';
      expect(location).toMatch(to);
    }
  });

  test('dashboard summary API authentifié', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const { status, body } = await fetchApi(page, '/api/dashboard/summary?period=week');
    expect(status).toBe(200);
    expect((body as { kpis?: unknown }).kpis).toBeTruthy();
  });

  test('backoffice articles API', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/backoffice/articles?limit=5');
    expect(status).toBe(200);
    const data = body as { items?: unknown[]; total?: number };
    expect(Array.isArray(data.items)).toBe(true);
    expect(typeof data.total).toBe('number');
  });

  test('POS catalogue API', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/pos/catalogue');
    expect(status).toBe(200);
    const data = body as { items?: unknown[]; source?: string };
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items!.length).toBeGreaterThan(0);
  });

  test('backoffice article templates API', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/backoffice/article-templates');
    expect(status).toBe(200);
    const data = body as { templates?: unknown[]; total?: number };
    expect(Array.isArray(data.templates)).toBe(true);
    expect((data.total ?? 0)).toBeGreaterThanOrEqual(7);
  });

  test('backoffice articles CRUD', async ({ page }) => {
    const testId = `e2e-crud-${Date.now()}`;

    const created = await fetchApi(page, '/api/backoffice/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: testId,
        articleLabel: 'Article E2E CRUD',
        family: 'test',
        prixBase: 1000,
      }),
    });
    expect(created.status).toBe(201);

    const detail = await fetchApi(page, `/api/backoffice/articles/${testId}`);
    expect(detail.status).toBe(200);

    const patched = await fetchApi(page, `/api/backoffice/articles/${testId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleLabel: 'Article E2E modifié', prixBase: 1500 }),
    });
    expect(patched.status).toBe(200);

    const archived = await fetchApi(page, `/api/backoffice/articles/${testId}`, {
      method: 'DELETE',
    });
    expect(archived.status).toBe(200);
    const archBody = archived.body as { mode?: string };
    expect(archBody.mode).toBe('archive');
  });
});
