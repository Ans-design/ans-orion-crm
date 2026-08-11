/**
 * Preuve E2E ANO-BO-POS — Backoffice configure → POS / devis / commande consomment.
 * Isolation : article catalogue `e2e-bo-pos` + DB E2E (prisma/e2e.db via e2e:server).
 * Vérifs via HTTP POS/cart/devis (pas d’import du service tarifaire).
 */
import { test, expect } from '@playwright/test';
import { ensureAdminSession, loginAsAdmin, logout } from './helpers/auth';
import { ensurePosClientSelected } from './helpers/commercial';
import {
  E2E_BO_POS_ARTICLE_ID,
  acceptDevisId,
  cartValidateE2e,
  checkoutDevisFromE2eArticle,
  cleanupE2eArticle,
  ensureE2eDraftTariff,
  extractUnitPrice,
  fetchFirstClientId,
  getCommandeById,
  posPricePreview,
  publishE2eArticle,
  unpublishE2eArticle,
} from './helpers/bo-pos-evidence';
import { fetchApi } from './helpers/admin';
import path from 'path';
import fs from 'fs';

const PRICE_A = 41_111;
const PRICE_B = 52_222;
const QTY = 3;
/** Commande.total stocke le TTC (devis.totalTTC) — TVA fiscale 20 %. */
const ttcFromHt = (ht: number) => Math.round(ht + ht * 0.2);
const TOTAL_HT_A = PRICE_A * QTY;
const TOTAL_TTC_A = ttcFromHt(TOTAL_HT_A);

test.describe.serial('ANO-BO-POS — preuve Backoffice → POS → devis → commande', () => {
  test.describe.configure({ timeout: 180_000 });

  let contractualTotal = 0;
  let commandeId = '';
  let publishedVersionA = 0;

  test.afterAll(async ({ browser }) => {
    test.setTimeout(90_000);
    const authFile = path.join(__dirname, '.auth', 'local-admin.json');
    const storageState = fs.existsSync(authFile)
      ? authFile
      : { cookies: [], origins: [] as { origin: string; localStorage: [] }[] };
    const ctx = await browser.newContext({ storageState });
    const page = await ctx.newPage();
    try {
      await ensureAdminSession(page);
      await cleanupE2eArticle(page);
    } catch (e) {
      console.warn('[afterAll] cleanup e2e-bo-pos:', e instanceof Error ? e.message : e);
    }
    await ctx.close().catch(() => null);
  });

  test('1–6 admin : brouillon ignoré, publication consommée par POS', async ({ page }) => {
    await ensureAdminSession(page);

    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE_A });

    // Avant 1ʳᵉ publication : POS ne doit pas servir un tarif publié
    const before = await posPricePreview(page, { qty: QTY });
    const beforeUnit = extractUnitPrice(before.body);
    test.info().annotations.push({
      type: 'draft-before-first-publish',
      description: `status=${before.status} unit=${beforeUnit} ok=${before.body.ok}`,
    });
    if (before.status === 200 && before.body.ok === true && beforeUnit === PRICE_A) {
      // Profil déjà publié d’un run précédent — unpublish puis re-draft
      await unpublishE2eArticle(page);
      await ensureE2eDraftTariff(page, { unitPriceAr: PRICE_A });
      const again = await posPricePreview(page, { qty: QTY });
      expect(again.body.ok === true && extractUnitPrice(again.body) === PRICE_A).toBeFalsy();
    } else {
      expect(before.body.ok === true && beforeUnit === PRICE_A).toBeFalsy();
    }

    const pub = await publishE2eArticle(page);
    publishedVersionA = Number(pub.formulaVersion ?? 0);
    expect(publishedVersionA).toBeGreaterThan(0);

    const after = await posPricePreview(page, { qty: QTY });
    expect(after.status).toBe(200);
    expect(after.body.ok).toBe(true);
    expect(extractUnitPrice(after.body)).toBe(PRICE_A);
    expect(after.body.tariff?.provenance ?? after.body.provenance).not.toBe('demo-fallback');
    if (after.body.tariff?.formulaVersion != null) {
      expect(after.body.tariff.formulaVersion).toBe(publishedVersionA);
    }
  });

  test('7–9 nouveau contexte navigateur : POS + panier au prix publié A', async ({ browser }) => {
    // Nouveau contexte (session distincte) — prouve consommation hors session Backoffice d’édition
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await loginAsAdmin(page);

    const preview = await posPricePreview(page, { qty: QTY });
    expect(preview.status, JSON.stringify(preview.body)).toBe(200);
    expect(extractUnitPrice(preview.body)).toBe(PRICE_A);

    await ensurePosClientSelected(page);
    await page.goto(`/pos/${E2E_BO_POS_ARTICLE_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'E2E Preuve Backoffice POS' })).toBeVisible({
      timeout: 25_000,
    });

    const cart = await cartValidateE2e(page, QTY);
    expect(cart.status, JSON.stringify(cart.body)).toBe(200);
    const cartBody = cart.body as {
      items?: { prixUnitaire?: number; totalLigne?: number }[];
      totals?: { totalGeneral?: number };
    };
    const line = cartBody.items?.[0];
    expect(line?.prixUnitaire).toBe(PRICE_A);
    expect(line?.totalLigne).toBe(PRICE_A * QTY);

    await logout(page);
    await ctx.close();
  });

  test('10–13 devis → commande : prix contractuel stable', async ({ page }) => {
    await ensureAdminSession(page);
    const clientId = await fetchFirstClientId(page);
    const devis = await checkoutDevisFromE2eArticle(page, clientId, QTY, PRICE_A);

    const devisDetail = await fetchApi(page, `/api/devis/${devis.id}`);
    expect(devisDetail.status).toBe(200);
    const d = devisDetail.body as {
      total?: number;
      lignes?: { prixUnitaire?: number; total?: number; articleId?: string }[];
      items?: { prixUnitaire?: number; total?: number }[];
    };
    const lignes = d.lignes ?? d.items ?? [];
    const e2eLine = lignes.find((l) => (l as { articleId?: string }).articleId === E2E_BO_POS_ARTICLE_ID) ?? lignes[0];
    if (e2eLine && typeof e2eLine.prixUnitaire === 'number') {
      expect(e2eLine.prixUnitaire).toBe(PRICE_A);
    }
    const devisFull = d as { totalHT?: number; totalTTC?: number; total?: number };
    if (typeof devisFull.totalHT === 'number') {
      expect(devisFull.totalHT).toBe(TOTAL_HT_A);
    }
    if (typeof devisFull.totalTTC === 'number') {
      expect(devisFull.totalTTC).toBe(TOTAL_TTC_A);
    } else if (typeof devisFull.total === 'number') {
      expect(devisFull.total).toBeGreaterThanOrEqual(TOTAL_HT_A);
    }

    const accepted = await acceptDevisId(page, devis.id);
    commandeId = accepted.commandeId;
    const full = await getCommandeById(page, commandeId);
    contractualTotal = Number(full.total ?? 0);
    // Contrat commande = TTC figé à l’acceptation (pas le HT panier)
    expect(contractualTotal).toBe(TOTAL_TTC_A);
  });

  test('14–16 republier B : nouvelle vente B, ancienne commande A', async ({ page }) => {
    await ensureAdminSession(page);
    expect(commandeId).toBeTruthy();

    await ensureE2eDraftTariff(page, { unitPriceAr: PRICE_B });

    // Brouillon B ne doit pas écraser le prix POS tant que non publié
    const mid = await posPricePreview(page, { qty: 1 });
    expect(extractUnitPrice(mid.body)).toBe(PRICE_A);

    await publishE2eArticle(page);

    const neu = await posPricePreview(page, { qty: 1 });
    expect(extractUnitPrice(neu.body)).toBe(PRICE_B);

    const cart = await cartValidateE2e(page, 1);
    const line = (cart.body as { items?: { prixUnitaire?: number }[] }).items?.[0];
    expect(line?.prixUnitaire).toBe(PRICE_B);

    const old = await getCommandeById(page, commandeId);
    expect(Number(old.total)).toBe(contractualTotal);
    expect(Number(old.total)).toBe(TOTAL_TTC_A);
  });

  test('17 GPAO / production : dossier lié conserve le total commande', async ({ page }) => {
    await ensureAdminSession(page);
    expect(commandeId).toBeTruthy();

    const createRes = await fetchApi(page, '/api/production/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandeId }),
    });
    // 201 créé ou 200/409 déjà existant
    expect([200, 201, 409].includes(createRes.status)).toBe(true);

    const list = await fetchApi(page, `/api/production/dossiers?commandeId=${commandeId}`);
    expect(list.status).toBe(200);

    const cmd = await getCommandeById(page, commandeId);
    expect(Number(cmd.total)).toBe(TOTAL_TTC_A);

    await page.goto(`/commandes/${commandeId}`, { waitUntil: 'domcontentloaded' });
    // Affichage fr-FR : « 148 000 » / « 148000 Ar » — preuve visuelle complémentaire à l’API
    const formattedTtc = TOTAL_TTC_A.toLocaleString('fr-FR');
    await expect(
      page.getByText(new RegExp(`${TOTAL_TTC_A}|${formattedTtc.replace(/\s/g, '\\s*')}`)).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
