import { parsePagination, paginatedResult, wantsPagination } from '@/lib/api-pagination';
import { syncCommandeProductionStart, syncCommandeAfterProductionComplete, syncGpaoQualityFromProductionEtape } from '@/lib/services/production-commande-sync';
import type { Prisma } from '@prisma/client';
import { buildAuditDiff } from '@/lib/server/audit/entity-snapshot';
import { productionsRepository, buildProductionWhere } from './productions.repository';
import {
  DEFAULT_PRODUCTION_ETAPES,
  type CreateProductionInput,
  type ProductionListQuery,
  type UpdateProductionInput,
  type UpdateProductionEtapeInput,
} from './productions.validation';

export function parseProductionListQuery(searchParams: URLSearchParams): ProductionListQuery {
  return {
    search: searchParams.get('search') || '',
    statut: searchParams.get('statut') || '',
    commandeId: searchParams.get('commande') || '',
    paginate: wantsPagination(searchParams),
    pagination: parsePagination(searchParams),
  };
}

export async function listProductions(query: ProductionListQuery) {
  const where = buildProductionWhere(query);
  const productions = await productionsRepository.findMany(
    where,
    query.paginate ? { skip: query.pagination.skip, take: query.pagination.take } : undefined,
  );
  if (query.paginate) {
    const total = await productionsRepository.count(where);
    return paginatedResult(productions, total, query.pagination);
  }
  return productions;
}

export async function getProductionDetail(id: string) {
  return productionsRepository.findById(id);
}

export async function listProductionEtapes(productionId: string) {
  const production = await productionsRepository.findById(productionId);
  if (!production) return { ok: false as const, code: 'NOT_FOUND' as const };
  const etapes = await productionsRepository.listEtapes(productionId);
  return { ok: true as const, etapes, production };
}

export async function createProductionRecord(
  input: CreateProductionInput,
  auth: { userId: string; userName: string },
) {
  const transition = await syncCommandeProductionStart(input.commandeId, {
    userId: auth.userId,
    userName: auth.userName,
    force: Boolean(input.force),
  });

  if (transition.error === 'VALIDATION') {
    return { ok: false as const, code: 'VALIDATION' as const, message: transition.validation.message };
  }
  if (transition.error === 'NOT_FOUND') {
    return { ok: false as const, code: 'NOT_FOUND' as const, message: 'Commande introuvable' };
  }

  const etapes = (input.etapes?.length ? input.etapes : DEFAULT_PRODUCTION_ETAPES).map((e, i) => ({
    nom: e.nom,
    ordre: e.ordre ?? i + 1,
  }));
  const production = await productionsRepository.create({ ...input, etapes });

  const { syncTasksForCommande, syncProductionToTasks, linkDossierToProduction } = await import('@/lib/sync/orion-sync');
  await syncTasksForCommande(input.commandeId);
  await syncProductionToTasks(production.id, input.commandeId);
  await linkDossierToProduction(input.commandeId, production.id);

  return { ok: true as const, production };
}

export async function updateProductionRecord(
  id: string,
  input: UpdateProductionInput,
  auth: { userId: string; userName: string },
) {
  const existing = await productionsRepository.findById(id);
  if (!existing) return { ok: false as const, code: 'NOT_FOUND' as const };

  const data: Prisma.ProductionUpdateInput = {};
  if (input.statut !== undefined) data.statut = input.statut;
  if (input.priorite !== undefined) data.priorite = input.priorite;
  if (input.operateur !== undefined) data.operateur = input.operateur;
  if (input.machine !== undefined) data.machine = input.machine;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.avancement !== undefined) data.avancement = input.avancement;
  if (input.dateDebut !== undefined) data.dateDebut = input.dateDebut ? new Date(input.dateDebut) : null;
  if (input.dateFin !== undefined) data.dateFin = input.dateFin ? new Date(input.dateFin) : null;
  if (input.proofPhotoUrl !== undefined) {
    data.proofPhotoUrl = input.proofPhotoUrl;
    data.proofAt = input.proofPhotoUrl ? new Date() : null;
    if (input.proofPhotoUrl && auth.userName) data.proofBy = auth.userName;
  }
  if (input.proofNote !== undefined) data.proofNote = input.proofNote;
  if (input.proofBy !== undefined) data.proofBy = input.proofBy;

  const production = await productionsRepository.update(id, data);

  if (input.statut === 'Terminé') {
    const sync = await syncCommandeAfterProductionComplete(existing.commandeId, {
      userId: auth.userId,
      userName: auth.userName,
      force: Boolean(input.force),
    });
    if (sync.error === 'VALIDATION') {
      return { ok: false as const, code: 'VALIDATION' as const, message: sync.validation.message };
    }
  }

  const audit = buildAuditDiff(
    { statut: existing.statut, avancement: existing.avancement },
    { statut: production.statut, avancement: production.avancement },
    ['statut', 'avancement'],
  );

  return { ok: true as const, production, audit };
}

export async function updateProductionEtapeRecord(
  productionId: string,
  input: UpdateProductionEtapeInput,
  auth: { userId: string; userName: string },
) {
  const etapeBefore = await productionsRepository.findEtape(input.etapeId);
  if (!etapeBefore || etapeBefore.productionId !== productionId) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  const data: Record<string, unknown> = {};
  if (input.statut !== undefined) {
    data.statut = input.statut;
    if (input.statut === 'En cours') data.dateDebut = new Date();
    if (input.statut === 'Terminé') data.dateFin = new Date();
  }
  if (input.operateur !== undefined) data.operateur = input.operateur;
  if (input.machine !== undefined) data.machine = input.machine;
  if (input.notes !== undefined) data.notes = input.notes;

  await productionsRepository.updateEtape(input.etapeId, data);

  if (input.statut === 'Terminé') {
    const production = await productionsRepository.findById(productionId);
    if (production) {
      await syncGpaoQualityFromProductionEtape(production.commandeId, etapeBefore.nom);
    }
  }

  const etapes = await productionsRepository.listEtapes(productionId);
  const total = etapes.length;
  const done = etapes.filter((e) => e.statut === 'Terminé' || e.statut === 'Sauté').length;
  const avancement = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total;
  const anyInProgress = etapes.some((e) => e.statut === 'En cours');

  const productionBefore = await productionsRepository.findById(productionId);
  if (!productionBefore) return { ok: false as const, code: 'NOT_FOUND' as const };

  await productionsRepository.update(productionId, {
    avancement,
    statut: allDone ? 'Terminé' : anyInProgress ? 'En cours' : 'En attente',
    ...(allDone ? { dateFin: new Date() } : {}),
    ...(anyInProgress && !productionBefore.dateDebut ? { dateDebut: new Date() } : {}),
  });

  if (allDone) {
    const sync = await syncCommandeAfterProductionComplete(productionBefore.commandeId, {
      userId: auth.userId,
      userName: auth.userName,
    });
    if (sync.error === 'VALIDATION') {
      return { ok: false as const, code: 'VALIDATION' as const, message: sync.validation.message };
    }
  }

  const production = await productionsRepository.findById(productionId);
  if (!production) return { ok: false as const, code: 'NOT_FOUND' as const };

  return {
    ok: true as const,
    production,
    audit: {
      oldValue: { statut: etapeBefore.statut },
      newValue: { statut: input.statut ?? etapeBefore.statut },
      etapeLabel: etapeBefore.nom,
      etapeId: input.etapeId,
    },
  };
}
