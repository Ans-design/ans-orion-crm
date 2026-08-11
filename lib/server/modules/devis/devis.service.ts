import { Prisma, DevisStatut } from '@prisma/client';
import { normalizeDevisStatut } from '@/lib/server/data/enum-normalize';
import {
  devisExpiryWatchStatuts,
  devisStatutFromLabel,
  serializeDevisForApi,
} from '@/lib/server/data/prisma-statut-bridge';
import { parsePagination, paginatedResult, wantsPagination, type PaginationParams } from '@/lib/api-pagination';
import { defaultDevisValidUntil } from '@/lib/devis/devis-validity';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { prisma } from '@/lib/server/db/prisma';
import { getFiscalConfig } from '@/lib/services/fiscal-config-service';
import { htToTtcMga, roundMga } from '@/lib/pricing/mga-round';
import { buildDevisWhere, devisRepository, type DevisLigneCreateInput } from './devis.repository';
import type { CreateDevisInput, UpdateDevisInput } from './devis.validation';

export const DEVIS_STAGNANT_DAYS = 7;
export const DEVIS_EXPIRY_WARNING_DAYS = 5;

export type DevisListQuery = {
  search: string;
  statut: string;
  sort: string;
  stagnant: boolean;
  trash: boolean;
  paginate: boolean;
  pagination: PaginationParams;
  summary: boolean;
};

export function parseDevisListQuery(searchParams: URLSearchParams): DevisListQuery {
  return {
    search: searchParams.get('search') || '',
    statut: searchParams.get('statut') || '',
    sort: searchParams.get('sort') || 'date_desc',
    stagnant: searchParams.get('stagnant') === '1',
    trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
    paginate: wantsPagination(searchParams),
    pagination: parsePagination(searchParams),
    summary: searchParams.get('summary') === '1',
  };
}

export async function getDevisSummary() {
  return devisRepository.getSummary();
}

type DevisCommercialLike = {
  statut: string | DevisStatut;
  createdAt: Date | string;
  validUntil?: Date | string | null;
};

export function getDevisCommercialSignals(devis: DevisCommercialLike, now = new Date()) {
  const createdAt = devis.createdAt instanceof Date ? devis.createdAt : new Date(devis.createdAt);
  const validUntil = !devis.validUntil
    ? null
    : devis.validUntil instanceof Date
      ? devis.validUntil
      : new Date(devis.validUntil);
  const pendingStatuts = new Set(devisExpiryWatchStatuts());
  const statut = typeof devis.statut === 'string' ? devisStatutFromLabel(devis.statut) : devis.statut;
  const daysOpen = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)));
  const isPipelinePending = pendingStatuts.has(statut);
  const isStagnant = isPipelinePending && daysOpen >= DEVIS_STAGNANT_DAYS;

  let daysUntilExpiry: number | null = null;
  if (validUntil) {
    daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  }

  return {
    daysOpen,
    isStagnant,
    daysUntilExpiry,
    expiresSoon: isPipelinePending && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= DEVIS_EXPIRY_WARNING_DAYS,
  };
}

function enrichDevisForApi<T extends { statut: string | DevisStatut; createdAt: Date | string; validUntil?: Date | string | null }>(row: T) {
  return {
    ...row,
    ...getDevisCommercialSignals(row),
  };
}

function stagnantDevisCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - DEVIS_STAGNANT_DAYS);
  return cutoff;
}

function parseDevisSort(sort: string): Prisma.DevisOrderByWithRelationInput | Prisma.DevisOrderByWithRelationInput[] {
  switch (sort) {
    case 'date_asc':
      return { createdAt: 'asc' };
    case 'client_az':
      return { client: { name: 'asc' } };
    case 'client_za':
      return { client: { name: 'desc' } };
    case 'montant_desc':
      return { totalHT: 'desc' };
    default:
      return { createdAt: 'desc' };
  }
}

export async function listDevis(query: Omit<DevisListQuery, 'summary'>) {
  const where = buildDevisWhere({
    search: query.search || undefined,
    statut: query.statut || undefined,
    stagnant: query.stagnant,
    stagnantBefore: query.stagnant ? stagnantDevisCutoff() : undefined,
    trash: query.trash,
  });

  const devis = await devisRepository.findManyWithRelations(
    where,
    query.paginate ? { skip: query.pagination.skip, take: query.pagination.take } : undefined,
    parseDevisSort(query.sort),
  );
  const serialized = devis.map((row) => enrichDevisForApi(serializeDevisForApi(row)));

  if (query.paginate) {
    const total = await devisRepository.count(where);
    return paginatedResult(serialized, total, query.pagination);
  }
  return serialized;
}

function buildDevisLignes(lignes: CreateDevisInput['lignes']) {
  let sousTotal = 0;
  const devisLignes: DevisLigneCreateInput[] = lignes.map((l, i) => {
    const totalLigne =
      l.totalForce ?? (l.prixUnitaireForce ? l.prixUnitaireForce * l.quantity : l.prixUnitaireAuto * l.quantity);
    sousTotal += totalLigne;
    return {
      articleId: l.articleId,
      articleLabel: l.articleLabel,
      category: l.category || 'general',
      configSnapshot: (l.configSnapshot || {}) as Prisma.InputJsonValue,
      quantity: l.quantity,
      unite: l.unite || 'ex.',
      prixUnitaireAuto: l.prixUnitaireAuto,
      prixUnitaireForce: l.prixUnitaireForce ?? null,
      totalForce: l.totalForce ?? null,
      totalLigne,
      pricingMode: l.pricingMode || 'auto',
      priceReason: l.priceReason || null,
      remarks: l.remarks || null,
      sortOrder: i,
    };
  });
  return { sousTotal, devisLignes };
}

export async function createDevisRecord(input: CreateDevisInput) {
  const { clientId, lignes, remise, notes, validUntil } = input;
  const fiscal = await getFiscalConfig();
  const numero = await nextSequenceSafe('DEV', () => prisma.devis.count());
  const { sousTotal, devisLignes } = buildDevisLignes(lignes);

  const remiseAmount = roundMga((sousTotal * remise) / 100);
  const totalHT = roundMga(sousTotal - remiseAmount);
  const totalTTC = htToTtcMga(totalHT, fiscal.tvaRate);

  const devis = await devisRepository.create({
    numero,
    clientId: clientId || null,
    sousTotal,
    remise,
    totalHT,
    totalTTC,
    notes: notes || null,
    validUntil: validUntil ? new Date(validUntil) : defaultDevisValidUntil(),
    lignes: { create: devisLignes },
  });

  return { devis, totalTTC };
}

export async function notifyDevisCreated(
  devis: { id: string; numero: string },
  totalTTC: number,
  auth: { userId: string; userName: string; role: string },
) {
  const { createDevisConversation, sendTalkMessage } = await import('@/lib/messaging/messaging-service');
  await createDevisConversation(devis.id, { userId: auth.userId, userName: auth.userName })
    .then(async (conv) => {
      await sendTalkMessage({
        conversationId: conv.id,
        userId: auth.userId,
        userName: auth.userName,
        userRole: auth.role,
        body: `📋 Devis ${devis.numero} créé — ${Math.round(totalTTC).toLocaleString('fr-FR')} Ar TTC`,
      }).catch(() => {});
    })
    .catch((err) => {
      console.error('[ANS Talk] Échec création groupe devis:', devis.id, err);
    });
}

export async function getDevisDetail(id: string) {
  const devis = await devisRepository.findByIdWithDetail(id);
  return devis ? enrichDevisForApi(serializeDevisForApi(devis)) : null;
}

export async function updateDevisRecord(id: string, input: UpdateDevisInput) {
  const existing = await devisRepository.findByIdWithLignes(id);
  if (!existing) return { status: 'not_found' as const };

  // Accepté uniquement via acceptDevisToCommande (création commande + snapshot)
  const requestedStatut =
    input.statut !== undefined ? normalizeDevisStatut(input.statut) : undefined;
  if (
    requestedStatut === 'Accepté' ||
    input.statut === 'Accepté' ||
    input.statut === 'Accepte'
  ) {
    return {
      status: 'blocked_accept' as const,
      message: 'Utilisez l’action Accepter le devis (création commande) — PUT statut Accepté interdit',
    };
  }

  const updateData: Record<string, unknown> = {};
  if (input.statut !== undefined) updateData.statut = devisStatutFromLabel(requestedStatut!);
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.clientId !== undefined) updateData.clientId = input.clientId;
  if (input.remise !== undefined) {
    const fiscal = await getFiscalConfig();
    updateData.remise = input.remise;
    const sousTotal = roundMga(existing.lignes.reduce((s, l) => s + l.totalLigne, 0));
    const remiseAmount = roundMga((sousTotal * input.remise) / 100);
    updateData.sousTotal = sousTotal;
    updateData.totalHT = roundMga(sousTotal - remiseAmount);
    updateData.totalTTC = htToTtcMga(sousTotal - remiseAmount, fiscal.tvaRate);
  }

  const devis = await devisRepository.update(id, updateData);
  return { status: 'updated' as const, devis, existing, updateData };
}

export type DeleteDevisOutcome =
  | { status: 'not_found' }
  | { status: 'blocked'; reason: string }
  | { status: 'deleted' }
  | { status: 'archived' };

export async function deleteDevisRecord(
  id: string,
  userId?: string | null,
): Promise<DeleteDevisOutcome> {
  const existing = await devisRepository.findByIdWithCommandeCount(id);
  if (!existing) return { status: 'not_found' };
  if (existing.statut === DevisStatut.Accepte || existing._count.commandes > 0) {
    return { status: 'blocked', reason: 'Impossible d’archiver un devis déjà validé ou lié à une commande' };
  }
  await devisRepository.softArchive(id, userId);
  return { status: 'archived' };
}

export async function restoreDevisRecord(id: string): Promise<'not_found' | 'restored'> {
  const existing = await devisRepository.findByIdWithCommandeCount(id);
  if (!existing) return 'not_found';
  await devisRepository.restore(id);
  return 'restored';
}
