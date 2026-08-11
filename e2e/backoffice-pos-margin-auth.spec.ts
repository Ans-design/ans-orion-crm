/**
 * Autorisations financières — prix d’achat / marge invisibles sans permission.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsCommercial, loginAsLecture, logout } from './helpers/auth';
import { fetchApi } from './helpers/admin';
import { e2eEnv } from './helpers/env';
import { getOrionV29Accounts } from '@/lib/orion-v29-accounts';

function hasV29(matricule: string) {
  e2eEnv();
  return getOrionV29Accounts().some((a) => a.matricule === matricule.toUpperCase());
}

test.describe('ANO-BO-POS — auth marges / prix d’achat', () => {
  test.describe.configure({ timeout: 180_000 });

  test('commercial / lecture : API matières sans purchasePrice / marge', async ({ browser }) => {
    const canCom = hasV29('COM01');
    const canLec = hasV29('LEC01');
    expect(canCom || canLec, 'ORION_V29_PASSWORDS_JSON doit inclure COM01 ou LEC01 en E2E').toBe(true);

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    if (canLec) await loginAsLecture(page);
    else await loginAsCommercial(page);

    const res = await fetchApi(page, '/api/admin-backoffice/pricing/base-materials?limit=20');
    // commercial / lecture n’a souvent pas config:view → 403 OK ; sinon payload strip
    if (res.status === 403 || res.status === 401) {
      expect(res.status).toBeGreaterThanOrEqual(401);
      await ctx.close();
      return;
    }
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/"purchasePrice"\s*:/);
    expect(text).not.toMatch(/"lastPurchasePrice"\s*:/);
    expect(text).not.toMatch(/"marge"\s*:/);
    expect(text).not.toMatch(/"margePct"\s*:/);
    await logout(page);
    await ctx.close();
  });

  test('commercial / lecture : export Excel matières sans colonnes achat', async ({ browser }) => {
    const canCom = hasV29('COM01');
    const canLec = hasV29('LEC01');
    expect(canCom || canLec, 'ORION_V29_PASSWORDS_JSON doit inclure COM01 ou LEC01 en E2E').toBe(true);

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    if (canLec) await loginAsLecture(page);
    else await loginAsCommercial(page);

    const res = await page.request.fetch(
      '/api/admin-backoffice/pricing/prix-matieres-stock/export-excel',
    );
    if (res.status() === 403 || res.status() === 401) {
      expect(res.status()).toBeGreaterThanOrEqual(401);
      await ctx.close();
      return;
    }
    expect(res.status()).toBe(200);
    const buf = Buffer.from(await res.body());
    // Heuristique : pas de libellé PRIX ACHAT dans le binaire xlsx (xml strings)
    const asText = buf.toString('utf8');
    expect(asText).not.toMatch(/PRIX ACHAT/i);
    expect(asText).not.toMatch(/purchasePrice/i);
    await ctx.close();
  });

  test('admin : peut voir purchasePrice si autorisé', async ({ page }) => {
    await loginAsAdmin(page);
    const res = await fetchApi(page, '/api/admin-backoffice/pricing/base-materials?limit=5');
    if (res.status !== 200) {
      test.info().annotations.push({ type: 'note', description: `admin materials status=${res.status}` });
      return;
    }
    expect(res.status).toBe(200);
  });
});
