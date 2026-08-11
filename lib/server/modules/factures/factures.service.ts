import { parsePagination, paginatedResult, wantsPagination, type PaginationParams } from '@/lib/api-pagination';
import { getFactureListStats } from '@/lib/factures/aggregate-stats';
import { prisma } from '@/lib/server/db/prisma';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { FactureStatut } from '@prisma/client';
import {
  factureStatutFromLabel,
  lockedFactureStatuts,
  serializeFactureForApi,
} from '@/lib/server/data/prisma-statut-bridge';
import { FACTURE_AUDIT_FIELDS, buildAuditDiff, toAuditRecord } from '@/lib/server/audit/entity-snapshot';
import {
  buildFactureWhere,
  facturesRepository,
  paidTotal,
  parseFactureListFilters,
} from './factures.repository';
import { assertCommandeBillable } from '@/lib/commande/facture-snapshot-guard';
import { htToTtcMga, roundMga } from '@/lib/pricing/mga-round';
import { getFiscalConfig } from '@/lib/services/fiscal-config-service';
import { DEFAULT_FISCAL } from '@/lib/fiscal-config';
import type { CreateFactureInput, FactureListQuery, UpdateFactureInput } from './factures.validation';

export type FactureListParams = FactureListQuery & {
  paginate: boolean;
  pagination: PaginationParams;
};

export type FactureServiceError = {
  ok: false;
  code: 'NOT_FOUND' | 'LOCKED' | 'LIGNES_LOCKED' | 'PAYE_INVALID' | 'BAD_REQUEST' | 'SNAPSHOT_MISSING';
  message: string;
};

export function parseFactureListQuery(searchParams: URLSearchParams): FactureListParams {
  return {
    search: searchParams.get('search') || '',
    statut: searchParams.get('statut') || '',
    impayes: searchParams.get('impayes') === '1',
    overdue: searchParams.get('overdue') === '1',
    commandeId: searchParams.get('commande') || searchParams.get('commandeId') || '',
    stats: searchParams.get('stats') === '1',
    trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
    paginate: wantsPagination(searchParams),
    pagination: parsePagination(searchParams),
  };
}

export async function getFacturesStats() {
  return getFactureListStats();
}

export async function listFactures(query: Omit<FactureListParams, 'stats'>) {
  const where = buildFactureWhere(parseFactureListFilters(query));
  const factures = await facturesRepository.findManyWithRelations(
    where,
    query.paginate ? { skip: query.pagination.skip, take: query.pagination.take } : undefined,
  );
  const serialized = factures.map(serializeFactureForApi);

  if (query.paginate) {
    const total = await facturesRepository.count(where);
    return paginatedResult(serialized, total, query.pagination);
  }
  return serialized;
}

export async function getFactureDetail(id: string) {
  const facture = await facturesRepository.findByIdWithDetail(id);
  return facture ? serializeFactureForApi(facture) : null;
}

export async function createFactureRecord(input: CreateFactureInput) {
  const { commandeId, clientId, lignes, remise, tva, notes, dateEcheance } = input;

  /** Canon commande : déléguer au workflow (TTC = commande.total). */
  if (commandeId && (!lignes || lignes.length === 0)) {
    const { ensureFactureForCommande } = await import('@/lib/services/facture-workflow-service');
    const result = await ensureFactureForCommande(commandeId, { remise });
    if ('error' in result) {
      throw new Error(result.message || String(result.error));
    }
    let facture = result.facture;
    if (notes !== undefined || dateEcheance !== undefined || (clientId && !facture.clientId)) {
      facture = await facturesRepository.update(facture.id, {
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(dateEcheance !== undefined
          ? { dateEcheance: dateEcheance ? new Date(dateEcheance) : null }
          : {}),
        ...(clientId && !facture.clientId ? { clientId } : {}),
      });
    }
    return facture;
  }

  if (commandeId) {
    const cmd = await prisma.commande.findUnique({
      where: { id: commandeId },
      include: { lignes: { orderBy: { sortOrder: 'asc' } } },
    });
    const guard = assertCommandeBillable(cmd);
    if (!guard.ok) {
      throw new Error(guard.message);
    }
  }

  const fiscal = await getFiscalConfig();
  const tvaRate = tva ?? fiscal.tvaRate ?? DEFAULT_FISCAL.tvaRate;
  const numero = await nextSequenceSafe('FAC', () => prisma.facture.count());

  const finalLignes = lignes || [];
  const sousTotal = roundMga(finalLignes.reduce((s, l) => s + l.total, 0));
  const remiseAmount = roundMga((remise / 100) * sousTotal);
  const totalHT = roundMga(sousTotal - remiseAmount);
  const totalTTC = htToTtcMga(totalHT, tvaRate);

  const facture = await facturesRepository.create({
    numero,
    commandeId: commandeId || null,
    clientId: clientId || null,
    lignes: finalLignes,
    sousTotal,
    remise,
    tva: tvaRate,
    totalHT,
    totalTTC,
    statut: FactureStatut.Brouillon,
    dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
    notes: notes || null,
  });

  return facture;
}

export async function updateFactureRecord(id: string, input: UpdateFactureInput) {
  const existing = await facturesRepository.findById(id);
  if (!existing) {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Facture introuvable' };
  }

  const locked = lockedFactureStatuts();
  if (locked.includes(existing.statut)) {
    return {
      ok: false as const,
      code: 'LOCKED' as const,
      message: `Facture verrouillée (statut : ${serializeFactureForApi(existing).statut})`,
    };
  }

  const emittedLocked =
    existing.statut === FactureStatut.Emise || existing.statut === FactureStatut.Partiellement_payee;
  if (emittedLocked) {
    const touchesMeta =
      input.notes !== undefined ||
      input.dateEcheance !== undefined ||
      input.lignes !== undefined ||
      input.remise !== undefined ||
      input.tva !== undefined;
    if (touchesMeta) {
      return {
        ok: false as const,
        code: 'LOCKED' as const,
        message: `Facture émise : notes, échéance, lignes et montants verrouillés (statut : ${serializeFactureForApi(existing).statut})`,
      };
    }
  }

  const data: Record<string, unknown> = {};

  if (input.statut !== undefined) {
    if (input.statut === 'Payée') {
      const withPaiements = await facturesRepository.findByIdWithPaiements(id);
      const totalPaye = paidTotal(withPaiements?.paiements ?? []);
      if (!withPaiements || totalPaye < withPaiements.totalTTC - 1) {
        return {
          ok: false as const,
          code: 'PAYE_INVALID' as const,
          message: 'Le statut Payée est réservé aux factures entièrement réglées via encaissement',
        };
      }
    }
    data.statut = factureStatutFromLabel(input.statut);
    if (input.statut === 'Émise') data.dateEmission = new Date();
  }

  if (input.notes !== undefined) data.notes = input.notes;
  if (input.dateEcheance !== undefined) {
    data.dateEcheance = input.dateEcheance ? new Date(input.dateEcheance) : null;
  }

  if (input.lignes !== undefined) {
    if (existing.statut !== FactureStatut.Brouillon) {
      return {
        ok: false as const,
        code: 'LIGNES_LOCKED' as const,
        message: 'Modification des lignes interdite après validation',
      };
    }
    data.lignes = input.lignes;
    const sousTotal = roundMga(input.lignes.reduce((s, l) => s + l.total, 0));
    const remise = input.remise ?? existing.remise;
    const tva = input.tva ?? existing.tva;
    const totalHT = roundMga(sousTotal - (remise / 100) * sousTotal);
    data.sousTotal = sousTotal;
    data.remise = remise;
    data.tva = tva;
    data.totalHT = totalHT;
    data.totalTTC = htToTtcMga(totalHT, tva);
  }

  const facture = await facturesRepository.update(id, data);
  const audit = buildAuditDiff(
    toAuditRecord(serializeFactureForApi(existing), FACTURE_AUDIT_FIELDS),
    toAuditRecord(serializeFactureForApi(facture), FACTURE_AUDIT_FIELDS),
    FACTURE_AUDIT_FIELDS,
  );
  return { ok: true as const, facture: serializeFactureForApi(facture), audit };
}

export function factureErrorStatus(code: FactureServiceError['code']) {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'LOCKED':
    case 'LIGNES_LOCKED':
      return 409;
    default:
      return 400;
  }
}
