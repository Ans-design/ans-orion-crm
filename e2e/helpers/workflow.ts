import type { Page } from '@playwright/test';
import { fetchApi } from './admin';

type JsonResult = { status: number; body: Record<string, unknown> | null };

async function postJson(page: Page, path: string, body: unknown): Promise<JsonResult> {
  return fetchApi(page, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Promise<JsonResult>;
}

async function patchJson(page: Page, path: string, body: unknown): Promise<JsonResult> {
  return fetchApi(page, path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Promise<JsonResult>;
}

/** Récupère la commande la plus récente (après acceptation devis). */
export async function getLatestCommande(page: Page): Promise<{ id: string; numero: string; total: number } | null> {
  const res = await fetchApi(page, '/api/commandes?paginated=1&limit=1');
  if (res.status !== 200) return null;
  const items = (res.body as { items?: { id: string; numero: string; total: number }[] })?.items;
  if (items?.length) return items[0];
  const list = res.body as { id: string; numero: string; total: number }[] | null;
  return Array.isArray(list) && list[0] ? list[0] : null;
}

/** Avance une commande jusqu'à « Livré » via workflow forcé (admin). */
export async function advanceCommandeToDelivered(page: Page, commandeId: string) {
  await postJson(page, `/api/commandes/${commandeId}/workflow`, { type: 'bootstrap' });

  const statuts = ['En production', 'En finition', 'Prête', 'Livré'] as const;
  for (const statut of statuts) {
    const res = await postJson(page, `/api/commandes/${commandeId}/workflow`, {
      type: 'statut',
      statut,
      force: true,
    });
    if (res.status !== 200) {
      throw new Error(`Workflow ${statut} failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
  }
}

/** Crée et valide un BAT pour la commande. */
export async function createAndValidateProof(page: Page, commandeId: string): Promise<string> {
  const createRes = await postJson(page, '/api/proofs', { commandeId });
  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Proof create failed: ${createRes.status}`);
  }
  const proofId = (createRes.body as { id: string }).id;
  const patchRes = await patchJson(page, `/api/proofs/${proofId}`, { statut: 'Validé' });
  if (patchRes.status !== 200) {
    throw new Error(`Proof validate failed: ${patchRes.status}`);
  }
  return proofId;
}

/** Planifie une livraison pour la commande. */
export async function createLivraison(page: Page, commandeId: string) {
  const res = await postJson(page, '/api/livraisons', {
    commandeId,
    livreur: 'E2E Bot',
    colisCount: 1,
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Livraison failed: ${res.status}`);
  }
  return res.body;
}

/** Génère la facture liée à la commande. */
export async function createFactureForCommande(page: Page, commandeId: string) {
  const res = await postJson(page, `/api/commandes/${commandeId}/facture`, {});
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Facture failed: ${res.status}`);
  }
  return res.body as { facture?: { id: string; totalTTC: number }; id?: string; totalTTC?: number };
}

/** Enregistre un paiement solde sur facture ou commande. */
export async function recordPaiement(
  page: Page,
  opts: { factureId?: string; commandeId?: string; montant: number },
) {
  const res = await postJson(page, '/api/paiements', {
    factureId: opts.factureId ?? null,
    commandeId: opts.commandeId ?? null,
    montant: opts.montant,
    mode: 'Espèces',
    type: 'Solde',
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Paiement failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}
