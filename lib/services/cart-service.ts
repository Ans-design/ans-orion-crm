import { Prisma, DevisStatut, CommandeStatut } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculatePrice, normalizeQty } from '@/lib/pricing/calculate';
import { mergeConfigWithPricingSnapshot } from '@/lib/pricing/pricing-snapshot-meta';
import { resolveMaterialStockSnapshot } from '@/lib/pricing/material-stock-snapshot';
import { validatePaperConfigStrict } from '@/lib/data/paper-material';
import { sanitizeCartItemConfig } from '@/lib/cart-config-sanitize';
import { CATALOGUE } from '@/lib/data/catalogue';
import { logPosAudit } from '@/lib/pos-audit';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import type { PrismaTx } from '@/lib/services/SequenceService';
import { PRISMA_TX_OPTIONS } from '@/lib/prisma-transaction';
import {
  buildCommandeArticleSummary,
  mapDevisLignesToCommande,
  sumCommandeLignes,
} from '@/lib/services/commande-service';
import { serializeDevisNotes, type DevisValidationMeta } from '@/lib/devis-meta';
import { defaultDevisValidUntil } from '@/lib/devis/devis-validity';
import { loadSellableProfileMap, assertArticleSellable } from '@/lib/pos/load-sellable-profiles';
import { isStrictPosPricing } from '@/lib/pos/pos-price-policy';
import { buildOrderAcceptSnapshot } from '@/lib/commande/order-snapshot';
import { parseDevisNotes } from '@/lib/devis-meta';
import { getFiscalConfig } from '@/lib/services/fiscal-config-service';
import { htToTtcMga, roundMga } from '@/lib/pricing/mga-round';

export const CART_PREF_CATEGORY = 'pos_cart';

export interface CartLineInput {
  id?: string;
  articleId: string;
  name?: string;
  category?: string;
  config: Record<string, unknown>;
  quantity: number;
}

export interface ValidatedCartLine {
  id: string;
  articleId: string;
  name: string;
  category: string;
  config: Record<string, unknown>;
  configSnapshot: Record<string, unknown>;
  quantity: number;
  prixUnitaire: number;
  totalLigne: number;
}

export interface CartMeta {
  remise?: number;
  acomptePct?: number;
  livraison?: number;
  clientId?: string | null;
  validation?: DevisValidationMeta;
}

export interface CartTotals {
  sousTotal: number;
  remiseAmount: number;
  afterRemise: number;
  livraison: number;
  totalGeneral: number;
  acompteAmount: number;
  resteAPayer: number;
  tva: number;
  totalTTC: number;
}

export async function validateCartLines(items: CartLineInput[]): Promise<ValidatedCartLine[]> {
  const validated: ValidatedCartLine[] = [];
  const sellableMap = isStrictPosPricing()
    ? await loadSellableProfileMap(items.map((i) => i.articleId))
    : null;

  for (const item of items) {
    const article = CATALOGUE.find((a) => a.id === item.articleId);
    if (!article) throw new Error(`Article « ${item.articleId} » introuvable`);

    if (sellableMap) {
      const profile = sellableMap.get(item.articleId);
      if (profile) assertArticleSellable(profile, article.name);
    }

    const normalized = sanitizeCartItemConfig(item.config as Record<string, unknown>);
    const paperCheck = validatePaperConfigStrict(normalized);
    if (!paperCheck.ok) throw new Error(paperCheck.error || 'Configuration papier invalide');

    const qty = normalizeQty(item.quantity ?? (item.config as Record<string, unknown>)?.quantite);
    const result = await calculatePrice(item.articleId, { ...normalized, qty });
    if (!result) throw new Error(`Impossible de calculer le prix pour « ${article.name} »`);

    const materialStock = await resolveMaterialStockSnapshot({
      materialKey: String(normalized.materialKey ?? normalized.matiere ?? ''),
      paperType: String(normalized.paperType ?? normalized.matiere ?? ''),
      grammage: String(normalized.paperWeight ?? normalized.grammage ?? ''),
    }).catch(() => null);

    validated.push({
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      articleId: item.articleId,
      name: item.name || article.name,
      category: item.category || article.category,
      config: normalized,
      configSnapshot: mergeConfigWithPricingSnapshot(normalized, result, materialStock),
      quantity: qty,
      prixUnitaire: result.prixUnitaire,
      totalLigne: result.totalHT,
    });
  }

  return validated;
}

export function computeCartTotals(
  items: Pick<ValidatedCartLine, 'totalLigne'>[],
  meta: CartMeta = {},
): CartTotals {
  const sousTotal = items.reduce((s, i) => s + i.totalLigne, 0);
  const remisePct = meta.remise ?? 0;
  const remiseAmount = Math.round(sousTotal * remisePct / 100);
  const afterRemise = sousTotal - remiseAmount;
  const livraison = meta.livraison ?? 0;
  const totalGeneral = afterRemise + livraison;
  const acomptePct = meta.acomptePct ?? 0;
  const acompteAmount = Math.round(totalGeneral * acomptePct / 100);
  const resteAPayer = totalGeneral - acompteAmount;
  const tva = Math.round(totalGeneral * 0.2);
  const totalTTC = totalGeneral + tva;

  return {
    sousTotal,
    remiseAmount,
    afterRemise,
    livraison,
    totalGeneral,
    acompteAmount,
    resteAPayer,
    tva,
    totalTTC,
  };
}

export async function loadUserCart(userId: string): Promise<{ items: ValidatedCartLine[]; meta: CartMeta }> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId_category: { userId, category: CART_PREF_CATEGORY } },
  });
  if (!pref?.data || typeof pref.data !== 'object') {
    return { items: [], meta: {} };
  }
  const data = pref.data as { items?: CartLineInput[]; meta?: CartMeta };
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.length === 0) return { items: [], meta: data.meta ?? {} };
  const items = await validateCartLines(rawItems);
  return { items, meta: data.meta ?? {} };
}

export async function saveUserCart(
  userId: string,
  items: CartLineInput[],
  meta: CartMeta,
  audit?: { userName?: string; action?: string },
): Promise<ValidatedCartLine[]> {
  const validated = await validateCartLines(items);
  const payload = { items: validated, meta } as unknown as Prisma.InputJsonValue;
  await prisma.userPreference.upsert({
    where: { userId_category: { userId, category: CART_PREF_CATEGORY } },
    create: { userId, category: CART_PREF_CATEGORY, data: payload },
    update: { data: payload },
  });
  if (audit) {
    await logPosAudit({
      userId,
      userName: audit.userName,
      action: audit.action || 'CART_UPDATE',
      entity: 'Panier',
      entityLabel: `${validated.length} ligne(s)`,
      details: { count: validated.length },
    });
  }
  return validated;
}

export async function clearUserCart(userId: string, userName?: string): Promise<void> {
  await prisma.userPreference.deleteMany({
    where: { userId, category: CART_PREF_CATEGORY },
  });
  await logPosAudit({
    userId,
    userName,
    action: 'CART_CLEAR',
    entity: 'Panier',
    entityLabel: 'Panier vidé',
  });
}

function buildDevisLignes(validated: ValidatedCartLine[]) {
  return validated.map((l, i) => ({
    articleId: l.articleId,
    articleLabel: l.name,
    category: l.category,
    configSnapshot: l.configSnapshot as Prisma.InputJsonValue,
    quantity: l.quantity,
    unite: 'ex.',
    prixUnitaireAuto: l.prixUnitaire,
    totalLigne: l.totalLigne,
    pricingMode: 'auto' as const,
    sortOrder: i,
  }));
}

export async function createDevisFromCart(
  validated: ValidatedCartLine[],
  meta: CartMeta,
  userId?: string,
  userName?: string,
) {
  const fiscal = await getFiscalConfig();
  const lignes = buildDevisLignes(validated);
  const sousTotal = roundMga(lignes.reduce((s, l) => s + l.totalLigne, 0));
  const remise = meta.remise ?? 0;
  const remiseAmount = roundMga((sousTotal * remise) / 100);
  const totalHT = roundMga(sousTotal - remiseAmount);
  const totalTTC = htToTtcMga(totalHT, fiscal.tvaRate);
  const numero = await nextSequenceSafe('DEV', () => prisma.devis.count());
  const notes = meta.validation
    ? serializeDevisNotes(meta.validation, meta.validation.notesLibres)
    : null;

  const devis = await prisma.devis.create({
    data: {
      numero,
      clientId: meta.clientId || null,
      sousTotal,
      remise,
      totalHT,
      totalTTC,
      notes,
      validUntil: meta.validation?.dateLivraison
        ? new Date(meta.validation.dateLivraison)
        : defaultDevisValidUntil(),
      lignes: { create: lignes },
    },
    include: { lignes: { orderBy: { sortOrder: 'asc' } } },
  });

  await logPosAudit({
    userId,
    userName,
    action: 'CART_DEVIS',
    entity: 'Devis',
    entityId: devis.id,
    entityLabel: devis.numero,
    details: { totalTTC: devis.totalTTC, lignes: lignes.length },
  });

  const { createDevisConversation, sendTalkMessage } = await import('@/lib/messaging/messaging-service');
  await createDevisConversation(devis.id, { userId, userName }).then(async (conv) => {
    if (!userId || !userName) return;
    await sendTalkMessage({
      conversationId: conv.id,
      userId,
      userName,
      userRole: 'commercial',
      body: `📋 Devis ${devis.numero} créé depuis le panier — ${Math.round(devis.totalTTC).toLocaleString('fr-FR')} Ar TTC`,
    }).catch(() => {});
  }).catch((err) => {
    console.error('[ANS Talk] Échec création groupe devis:', devis.id, err);
  });

  return devis;
}

/** @deprecated Utiliser acceptDevisToCommande — conservé pour compatibilité POS/panier. */
export async function createCommandeFromDevis(devisId: string, userId?: string, userName?: string) {
  const { acceptDevisToCommande } = await import('@/lib/services/devis-accept-service');
  const result = await acceptDevisToCommande(devisId, { userId, userName });
  if (!result.ok) throw new Error(result.message);

  const commande = await prisma.commande.findUnique({ where: { id: result.commande.id } });
  if (!commande) throw new Error('Commande introuvable après conversion');

  await logPosAudit({
    userId,
    userName,
    action: 'CART_COMMANDE',
    entity: 'Commande',
    entityId: commande.id,
    entityLabel: commande.numero,
  });

  return commande;
}

/** Après création commande — synchronise tâches GPAO liées */
export async function afterCommandeCreated(
  commandeId: string,
  opts?: { userId?: string; userName?: string; priorite?: string },
) {
  const { syncTasksForCommande, syncDossierForCommandeFromSync, syncBriefForCommandeFromSync } = await import('@/lib/sync/orion-sync');
  await syncTasksForCommande(commandeId, {
    createdById: opts?.userId,
    createdByName: opts?.userName,
    priorite: opts?.priorite,
  });
  await syncDossierForCommandeFromSync(commandeId, { priorite: opts?.priorite });
  await syncBriefForCommandeFromSync(commandeId);

  /* Pas de créneau Gantt auto : l’organisateur glisse la commande depuis le pool Planning. */
  try {
    const { bumpLiveRevisions } = await import('@/lib/server/live/live-revision-bus');
    bumpLiveRevisions(['commandes', 'devis', 'production', 'paiements', 'stock', 'nav']);
  } catch {
    /* ignore */
  }

  const { createOrderConversation } = await import('@/lib/messaging/messaging-service');
  const conversation = await createOrderConversation(commandeId, opts).catch((err) => {
    console.error('[ANS Talk] Échec création groupe commande:', commandeId, err);
    return null;
  });

  if (conversation?.id) {
    try {
      const { postSystemMessageForOrder } = await import('@/lib/messaging/order-system-message');
      await postSystemMessageForOrder(commandeId, conversation.id, opts);
    } catch (err) {
      console.error('[ANS Talk] Échec message système commande:', commandeId, err);
    }
  }

  return { synced: true };
}

/** @deprecated Délègue à ensureFactureForCommande (canon TTC commande + fiscal). */
export async function createFactureFromCommande(
  commandeId: string,
  clientId: string | null | undefined,
  remise: number,
  userId?: string,
  userName?: string,
) {
  const { ensureFactureForCommande } = await import('@/lib/services/facture-workflow-service');
  const result = await ensureFactureForCommande(commandeId, { userId, userName, remise });
  if ('error' in result) {
    throw new Error(result.message || String(result.error));
  }

  let facture = result.facture;
  if (clientId && !facture.clientId) {
    facture = await prisma.facture.update({
      where: { id: facture.id },
      data: { clientId },
    });
  }

  if (result.created) {
    await logPosAudit({
      userId,
      userName,
      action: 'CART_FACTURE',
      entity: 'Facture',
      entityId: facture.id,
      entityLabel: facture.numero,
      details: { totalTTC: facture.totalTTC, via: 'ensureFactureForCommande' },
    });
  }

  return facture;
}

/** Devis + commande en une transaction atomique (checkout POS). */
async function createDevisAndCommandeInTransaction(
  validated: ValidatedCartLine[],
  meta: CartMeta,
  tx: PrismaTx,
) {
  const fiscal = await getFiscalConfig();
  const lignes = buildDevisLignes(validated);
  const sousTotal = roundMga(lignes.reduce((s, l) => s + l.totalLigne, 0));
  const remise = meta.remise ?? 0;
  const remiseAmount = roundMga((sousTotal * remise) / 100);
  const totalHT = roundMga(sousTotal - remiseAmount);
  const totalTTC = htToTtcMga(totalHT, fiscal.tvaRate);
  const numeroDev = await nextSequenceSafe('DEV', () => tx.devis.count(), tx);
  const notes = meta.validation
    ? serializeDevisNotes(meta.validation, meta.validation.notesLibres)
    : null;

  const devis = await tx.devis.create({
    data: {
      numero: numeroDev,
      clientId: meta.clientId || null,
      sousTotal,
      remise,
      totalHT,
      totalTTC,
      notes,
      validUntil: meta.validation?.dateLivraison
        ? new Date(meta.validation.dateLivraison)
        : defaultDevisValidUntil(),
      lignes: { create: lignes },
    },
    include: { lignes: { orderBy: { sortOrder: 'asc' } } },
  });

  const ligneInputs = mapDevisLignesToCommande(devis.lignes);
  const { total, qty } = sumCommandeLignes(ligneInputs);
  const article = buildCommandeArticleSummary(ligneInputs.map((l) => l.articleLabel));
  const numeroCmd = await nextSequenceSafe('CMD', () => tx.commande.count(), tx);

  const client = devis.clientId
    ? await tx.client.findUnique({ where: { id: devis.clientId } })
    : null;
  const { meta: devisMeta } = parseDevisNotes(notes);
  const orderSnapshot = buildOrderAcceptSnapshot({
    devis: {
      id: devis.id,
      numero: devis.numero,
      sousTotal: devis.sousTotal,
      remise: devis.remise,
      totalHT: devis.totalHT,
      totalTTC: devis.totalTTC,
      validUntil: devis.validUntil,
      clientId: devis.clientId,
      client,
      lignes: devis.lignes.map((l) => ({
        articleId: l.articleId,
        articleLabel: l.articleLabel,
        configSnapshot: l.configSnapshot,
        quantity: l.quantity,
        totalLigne: l.totalLigne,
        prixUnitaireForce: l.prixUnitaireForce,
        prixUnitaireAuto: l.prixUnitaireAuto,
      })),
    },
    meta: meta.validation ?? devisMeta,
  });

  const commande = await tx.commande.create({
    data: {
      numero: numeroCmd,
      clientId: devis.clientId,
      devisId: devis.id,
      article,
      qty,
      total,
      reste: total,
      statut: CommandeStatut.A_planifier,
      priorite: 'Normal',
      configSnapshot: orderSnapshot as object,
      paymentSnapshot: orderSnapshot.paymentSnapshot as object,
      lignes: {
        create: ligneInputs.map((l, i) => ({
          articleId: l.articleId ?? null,
          articleLabel: l.articleLabel,
          configSnapshot: l.configSnapshot ?? undefined,
          quantity: l.quantity,
          totalLigne: l.totalLigne,
          sortOrder: l.sortOrder ?? i,
        })),
      },
    },
  });

  await tx.devis.update({
    where: { id: devis.id },
    data: { statut: DevisStatut.Accepte, acceptedAt: new Date() },
  });

  if (devis.clientId) {
    await tx.client.update({
      where: { id: devis.clientId },
      data: { cmds: { increment: 1 } },
    });
  }

  return { devis, commande };
}

/** Checkout commande atomique depuis le panier POS. */
export async function checkoutCommandeFromCart(
  validated: ValidatedCartLine[],
  meta: CartMeta,
  userId?: string,
  userName?: string,
) {
  const result = await prisma.$transaction(
    (tx) => createDevisAndCommandeInTransaction(validated, meta, tx),
    PRISMA_TX_OPTIONS,
  );

  await logPosAudit({
    userId,
    userName,
    action: 'CART_DEVIS',
    entity: 'Devis',
    entityId: result.devis.id,
    entityLabel: result.devis.numero,
    details: { totalTTC: result.devis.totalTTC, lignes: result.devis.lignes.length },
  });
  await logPosAudit({
    userId,
    userName,
    action: 'CART_COMMANDE',
    entity: 'Commande',
    entityId: result.commande.id,
    entityLabel: result.commande.numero,
  });
  await afterCommandeCreated(result.commande.id, { userId, userName, priorite: result.commande.priorite });

  return result;
}

/** Checkout facture atomique : commande + facture dédupliquée. */
export async function checkoutFactureFromCart(
  validated: ValidatedCartLine[],
  meta: CartMeta,
  userId?: string,
  userName?: string,
) {
  const { devis, commande } = await checkoutCommandeFromCart(validated, meta, userId, userName);
  const { ensureFactureForCommande } = await import('@/lib/services/facture-workflow-service');
  const factureResult = await ensureFactureForCommande(commande.id, { userId, userName });
  if ('error' in factureResult) throw new Error('FACTURE_CREATE_FAILED');
  return { devis, commande, facture: factureResult.facture, factureCreated: factureResult.created };
}
