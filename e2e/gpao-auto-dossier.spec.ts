import { test, expect } from '@playwright/test';
import { ensureAdminSession } from './helpers/auth';
import { fetchApi } from './helpers/admin';
import {
  acceptDevisByNumero,
  addArticleToCart,
  clearCartIfNeeded,
  createDevisFromCart,
} from './helpers/commercial';
import { getLatestCommande } from './helpers/workflow';
import { GPAO_16_ETAPES } from '@/lib/constants/gpao-dossier';

test.describe.serial('GPAO — auto-dossier 16 étapes', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test('commande confirmée → POST dossier → 16 étapes GPAO', async ({ page }) => {
    await clearCartIfNeeded(page);
    await addArticleToCart(page, 'fly-std');
    const numeroDevis = await createDevisFromCart(page);
    await acceptDevisByNumero(page, numeroDevis);

    const commande = await getLatestCommande(page);
    expect(commande, 'Commande créée après acceptation devis').toBeTruthy();
    if (!commande) return;

    const createRes = await fetchApi(page, '/api/production/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandeId: commande.id }),
    });
    expect(createRes.status).toBe(201);

    const payload = createRes.body as {
      created?: boolean;
      dossier?: { id: string; etapes?: { nom: string; ordre: number }[] };
    };
    expect(payload.created).toBe(true);
    expect(payload.dossier?.etapes?.length).toBe(16);
    expect(payload.dossier?.etapes?.map((e) => e.nom)).toEqual([...GPAO_16_ETAPES]);

    const listRes = await fetchApi(page, `/api/production/dossiers?commandeId=${commande.id}`);
    expect(listRes.status).toBe(200);
    const list = listRes.body as { id: string; commandeId: string }[];
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((d) => d.commandeId === commande.id)).toBe(true);

    const secondRes = await fetchApi(page, '/api/production/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandeId: commande.id }),
    });
    expect(secondRes.status).toBe(200);
    expect((secondRes.body as { created?: boolean }).created).toBe(false);
  });
});
