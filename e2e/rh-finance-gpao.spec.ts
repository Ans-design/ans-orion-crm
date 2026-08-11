import { test, expect } from '@playwright/test';
import { ensureAdminSession } from './helpers/auth';
import { fetchApi } from './helpers/admin';

async function ensureSession(page: import('@playwright/test').Page) {
  await ensureAdminSession(page);
}

test.describe('RH — employés & absences', () => {
  test.beforeEach(async ({ page }) => {
    await ensureSession(page);
  });

  test('API employés — liste', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/rh/employes');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test('API employés — stats', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/rh/employes?stats=1');
    expect(status).toBe(200);
    const stats = body as { totalActifs?: number; presentNow?: number };
    expect(typeof stats.totalActifs).toBe('number');
    expect(typeof stats.presentNow).toBe('number');
  });

  test('API absences — liste', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/rh/absences');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test('page employés & pointage', async ({ page }) => {
    await page.goto('/rh/employes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Employés.*pointage/i, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(/actifs|employé|département/i);
  });
});

test.describe('Finance — charges & dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await ensureSession(page);
  });

  test('API charges — liste', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/finance/charges');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test('API charges — stats trésorerie', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/finance/charges?stats=1');
    expect(status).toBe(200);
    const stats = body as { entreesMois?: number; sortiesMois?: number; tresorerieMois?: number };
    expect(typeof stats.entreesMois).toBe('number');
    expect(typeof stats.sortiesMois).toBe('number');
    expect(typeof stats.tresorerieMois).toBe('number');
  });

  test('API dashboard finance slice', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/dashboard/finance?period=month');
    expect(status).toBe(200);
    const data = body as { caVsDepenses?: unknown; chargesByCategory?: unknown };
    expect(data.caVsDepenses != null || data.chargesByCategory != null).toBeTruthy();
  });

  test('page charges & dépenses', async ({ page }) => {
    await page.goto('/finance/charges', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Charges.*dépenses/i, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(/trésorerie|entrées|sorties/i);
  });
});

test.describe('GPAO — dossiers production', () => {
  test.beforeEach(async ({ page }) => {
    await ensureSession(page);
  });

  test('API dossiers — liste', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/production/dossiers');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test('API dossiers — stats', async ({ page }) => {
    const { status, body } = await fetchApi(page, '/api/production/dossiers?stats=1');
    expect(status).toBe(200);
    const stats = body as { total?: number; enCours?: number; bloques?: number };
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.enCours).toBe('number');
    expect(typeof stats.bloques).toBe('number');
  });

  test('page dossiers GPAO 16 étapes', async ({ page }) => {
    await page.goto('/production/dossiers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Dossiers production GPAO/i, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(/16 étapes/i);
  });
});
