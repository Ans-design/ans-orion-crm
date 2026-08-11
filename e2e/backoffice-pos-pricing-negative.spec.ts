/**
 * ScÃ©narios nÃ©gatifs ANO-BO-POS â€” permissions, brouillon, cache, STRICT, double publishâ€¦
 */
import { test, expect } from '@playwright/test';
import { ensureAdminSession, loginAsAdmin, loginAsCommercial, loginAsLecture, logout } from './helpers/auth';
import {
  E2E_BO_POS_ARTICLE_ID,
  cleanupE2eArticle,
  ensureE2eDraftTariff,
  extractUnitPrice,
  posPricePreview,
  publishE2eArticle,
  publishViaRequest,
  unpublishE2eArticle,
} from './helpers/bo-pos-evidence';
import { fetchApi } from './helpers/admin';
import { e2eEnv } from './helpers/env';
import { getOrionV29Accounts } from '@/lib/orion-v29-accounts';

const PRICE = 33_333;
const PRICE2 = 44_444;

function hasV29(matricule: string) {
  e2eEnv();
  return getOrionV29Accounts().some((a) => a.matricule === matricule.toUpperCase());
}

test.describe.serial('ANO-BO-POS nÃ©gatifs', () => {
  test.describe.configure({ timeout: 180_000 });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    try {
      await ensureAdminSession(page);
      await cleanupE2eArticle(page);
    } catch {
      /* ignore */
    }
    await ctx.close();
  });

  test('utilisateur sans permission de publication', async ({ page }) => {
    const canCom = hasV29('COM01');
    const canLec = hasV29('LEC01');
    expect(canCom || canLec, 'ORION_V29_PASSWORDS_JSON doit inclure COM01 ou LEC01 en E2E').toBe(true);

    await loginAsAdmin(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE });

    await logout(page);
    if (canLec) await loginAsLecture(page);
    else await loginAsCommercial(page);

    const res = await page.request.fetch(`/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, {
      method: 'POST',
      data: { action: 'publish' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });

  test('brouillon non publiÃ© : POS garde lâ€™ancien publiÃ©', async ({ page }) => {
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE });
    await publishE2eArticle(page);
    expect(extractUnitPrice((await posPricePreview(page)).body)).toBe(PRICE);

    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE2 });
    expect(extractUnitPrice((await posPricePreview(page)).body)).toBe(PRICE);
  });

  test('article sans tarif / unpublish : POS refuse ou indisponible', async ({ page }) => {
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE });
    await publishE2eArticle(page);
    await unpublishE2eArticle(page);
    const preview = await posPricePreview(page);
    const unit = extractUnitPrice(preview.body);
    expect(preview.body.ok === true && unit === PRICE).toBeFalsy();
  });

  test('option non reconnue : panier / preview ne plante pas avec option inconnue', async ({ page }) => {
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE });
    await publishE2eArticle(page);
    const preview = await posPricePreview(page, { qty: 1, optionInconnue: 'xyz-e2e' });
    expect(preview.status).toBeLessThan(500);
    expect(extractUnitPrice(preview.body)).toBe(PRICE);
  });

  test('double clic publication : idempotent / pas dâ€™erreur 5xx', async ({ page }) => {
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE });
    const r1 = await publishViaRequest(page.request);
    const r2 = await publishViaRequest(page.request);
    expect(r1.status()).toBeLessThan(500);
    expect(r2.status()).toBeLessThan(500);
    expect(extractUnitPrice((await posPricePreview(page)).body)).toBe(PRICE);
  });

  test('publication concurrente : les deux requÃªtes se terminent sans 5xx', async ({ page }) => {
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE2 });
    const [a, b] = await Promise.all([
      publishViaRequest(page.request),
      publishViaRequest(page.request),
    ]);
    expect(a.status()).toBeLessThan(500);
    expect(b.status()).toBeLessThan(500);
    expect(extractUnitPrice((await posPricePreview(page)).body)).toBe(PRICE2);
  });

  test('erreur réseau pendant publication : reprise après refresh', async ({ page }) => {
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE });

    // page.route n’intercept pas page.request — utiliser fetch navigateur
    await page.route(`**/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    const failed = await page.evaluate(async (articleId) => {
      try {
        const res = await fetch(`/api/dynamic-pricing/${articleId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'publish' }),
        });
        return { status: res.status, ok: res.ok };
      } catch {
        return null;
      }
    }, E2E_BO_POS_ARTICLE_ID);
    expect(failed === null || failed.status >= 400 || !failed.ok).toBeTruthy();

    await page.unroute(`**/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureAdminSession(page);
    await publishE2eArticle(page);
    expect(extractUnitPrice((await posPricePreview(page)).body)).toBe(PRICE);
  });

  test('lecture seule : pas de publish', async ({ browser }) => {
    expect(hasV29('LEC01'), 'ORION_V29_PASSWORDS_JSON doit inclure LEC01 en E2E').toBe(true);
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await loginAsLecture(page);
    const res = await page.request.fetch(`/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, {
      method: 'POST',
      data: { action: 'publish' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    await ctx.close();
  });

  test('sans session : publish refusé', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const res = await page.request.fetch(`/api/dynamic-pricing/${E2E_BO_POS_ARTICLE_ID}`, {
      method: 'POST',
      data: { action: 'publish' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    await ctx.close();
  });

  test('absence Excel legacy : preview e2e-bo-pos ne dÃ©pend pas des grilles', async ({ page }) => {
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE });
    await publishE2eArticle(page);
    const preview = await posPricePreview(page);
    expect(extractUnitPrice(preview.body)).toBe(PRICE);
    expect(String(preview.body.tariff?.provenance ?? '')).not.toMatch(/excel|prixDepart/i);
  });

  test('cache ancien : skip via nouvelle preview aprÃ¨s publish (gÃ©nÃ©ration invalidÃ©e)', async ({ page }) => {
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE });
    await publishE2eArticle(page);
    expect(extractUnitPrice((await posPricePreview(page)).body)).toBe(PRICE);
    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE2 });
    await publishE2eArticle(page);
    expect(extractUnitPrice((await posPricePreview(page)).body)).toBe(PRICE2);
  });
});

test.describe('ANO-BO-POS â€” tarif expirÃ© / futur (limites schÃ©ma)', () => {
  test('PricingRelease nâ€™expose pas validFrom/validTo â€” documentÃ© NOT_APPLICABLE', async () => {
    // Limite produit : pas de fenÃªtre de validitÃ© native sur FormulaVersion / PricingRelease.
    // Les scÃ©narios Â« tarif expirÃ© / futur Â» ne sont donc pas exÃ©cutables E2E tant que le schÃ©ma nâ€™expose pas ces champs.
    test.info().annotations.push({
      type: 'limit',
      description: 'NOT_APPLICABLE â€” validFrom/validTo absents du modÃ¨le FormulaVersion / PricingRelease',
    });
    expect(true).toBe(true);
  });
});
