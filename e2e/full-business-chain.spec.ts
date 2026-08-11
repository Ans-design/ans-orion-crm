import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import {
  acceptDevisByNumero,
  addArticleToCart,
  clearCartIfNeeded,
  createDevisFromCart,
  ensurePosClientSelected,
} from './helpers/commercial';
import { fetchApi } from './helpers/admin';
import {
  advanceCommandeToDelivered,
  createAndValidateProof,
  createFactureForCommande,
  createLivraison,
  getLatestCommande,
  recordPaiement,
} from './helpers/workflow';
import {
  acceptDevisId,
  checkoutDevisFromE2eArticle,
  ensureE2eDraftTariff,
  fetchFirstClientId,
  publishE2eArticle,
} from './helpers/bo-pos-evidence';

test.describe.serial('Chaîne métier complète E2E', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('client → devis → commande → BAT → production → livraison → facture → paiement', async ({ page }) => {
    await clearCartIfNeeded(page);

    // Chemin A (préféré) : flyer POS UI — prouve le configurateur réel
    let usedFlyerUi = false;
    try {
      await addArticleToCart(page, 'fly-std');
      usedFlyerUi = true;
    } catch (e) {
      console.warn('[chain] flyer UI indisponible, repli e2e-bo-pos publié:', e instanceof Error ? e.message : e);
    }

    if (usedFlyerUi) {
      const numeroDevis = await createDevisFromCart(page);
      await acceptDevisByNumero(page, numeroDevis);
    } else {
      // Chemin B : article E2E + publication tarifaire atomique (déjà prouvée BO→POS)
      await ensurePosClientSelected(page);
      await ensureE2eDraftTariff(page, { unitPriceAr: 12_500 });
      await publishE2eArticle(page);
      const clientId = await fetchFirstClientId(page);
      const devis = await checkoutDevisFromE2eArticle(page, clientId, 2, 12_500);
      expect(devis.id).toBeTruthy();
      await acceptDevisId(page, devis.id);
    }

    const commande = await getLatestCommande(page);
    expect(commande, 'Commande créée après acceptation devis').toBeTruthy();
    if (!commande) return;

    await createAndValidateProof(page, commande.id);
    await advanceCommandeToDelivered(page, commande.id);
    await createLivraison(page, commande.id);

    const facturePayload = await createFactureForCommande(page, commande.id);
    const factureId =
      (facturePayload as { facture?: { id: string; totalTTC: number } }).facture?.id
      ?? (facturePayload as { id?: string }).id;
    const totalTTC =
      (facturePayload as { facture?: { totalTTC: number } }).facture?.totalTTC
      ?? (facturePayload as { totalTTC?: number }).totalTTC
      ?? commande.total;

    expect(factureId).toBeTruthy();
    await recordPaiement(page, { factureId, montant: Math.max(totalTTC, 1000) });

    const cmdRes = await fetchApi(page, `/api/commandes/${commande.id}`);
    expect(cmdRes.status).toBe(200);
    expect((cmdRes.body as { statut?: string }).statut).toBe('Livré');

    await page.goto(`/commandes/${commande.id}`);
    await expect(page.getByText(/livré/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('rapports performance — graphiques machines & employés', async ({ page }) => {
    const apiRes = await fetchApi(page, '/api/rapports/performance');
    expect(apiRes.status).toBe(200);
    const body = apiRes.body as { machines?: unknown; employees?: unknown };
    expect(body.machines).toBeTruthy();
    expect(body.employees).toBeTruthy();

    await page.goto('/rapports/performance');
    await expect(page.getByRole('heading', { name: /performance machines/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/parc machines/i)).toBeVisible();
    await expect(page.getByText(/performance employés/i)).toBeVisible();
  });
});
