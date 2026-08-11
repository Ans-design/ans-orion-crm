import { parsePagination, paginatedResult, wantsPagination, type PaginationParams } from '@/lib/api-pagination';
import { parseApiDateRange } from '@/lib/date-filter';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';
import { CommandeStatut } from '@prisma/client';
import { prisma } from '@/lib/server/db/prisma';
import { serializeCommandeForApi } from '@/lib/server/data/prisma-statut-bridge';
import { resolveCommandeListNextAction } from '@/lib/commande/commande-list-next-action';
import { transitionCommandeStatut } from '@/lib/services/commande-workflow-service';
import { isCommandeStatut } from '@/lib/workflow/commande-workflow';
import { buildCommandeWhere, commandesRepository } from './commandes.repository';
import {
  applyPaymentTotalsToCommande,
  batchCommandePaymentTotals,
  findCommandeIdsWithResteAPayer,
} from './commandes-payment-totals';
import type { UpdateCommandeInput } from './commandes.validation';
import {
  activeProductionCommandeStatuts,
  cancelledCommandeStatuts,
  completedCommandeStatuts,
} from '@/lib/server/data/prisma-statut-bridge';

export type UpdateCommandeContext = {
  userId: string;
  userName: string;
  role: string;
};

export type UpdateCommandeFailure = {
  ok: false;
  code: 'NOT_FOUND' | 'FORBIDDEN' | 'BAD_REQUEST' | 'VALIDATION' | 'CONFLICT';
  message: string;
};

export type UpdateCommandeSuccess = {
  ok: true;
  commande: NonNullable<Awaited<ReturnType<typeof commandesRepository.findByIdWithListInclude>>>;
  before: NonNullable<Awaited<ReturnType<typeof commandesRepository.findById>>>;
  audit: {
    action: 'STATUS_CHANGE' | 'UPDATE';
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
  };
  notify?: {
    title: string;
    message: string;
    type: 'warning' | 'info';
  };
};

export type UpdateCommandeResult = UpdateCommandeFailure | UpdateCommandeSuccess | { ok: true; noop: true; commande: NonNullable<Awaited<ReturnType<typeof commandesRepository.findById>>> };

function buildBaseUpdateFields(input: UpdateCommandeInput) {
  const { priorite, operateur, machine, note, dateLiv } = input;
  const updateData: Record<string, unknown> = {};
  if (priorite !== undefined) updateData.priorite = priorite;
  if (operateur !== undefined) updateData.operateur = operateur;
  if (machine !== undefined) updateData.machine = machine;
  if (note !== undefined) updateData.note = note;
  if (dateLiv !== undefined) updateData.dateLiv = dateLiv ? new Date(dateLiv) : null;
  return updateData;
}

export async function updateCommandeRecord(
  id: string,
  input: UpdateCommandeInput,
  ctx: UpdateCommandeContext,
): Promise<UpdateCommandeResult> {
  const { statut, avancement, acompte, force } = input;
  const updateData = buildBaseUpdateFields(input);

  const before = await commandesRepository.findById(id);
  if (!before) return { ok: false, code: 'NOT_FOUND', message: 'Commande introuvable' };

  if (acompte !== undefined) {
    // FIN-02 : ledger = unique vérité — aucun écrasement manuel de l’acompte
    const { syncCommandePaiementTotals } = await import(
      '@/lib/services/facture-workflow-service'
    );
    if (force && ['admin', 'manager'].includes(ctx.role)) {
      await syncCommandePaiementTotals(id);
    } else {
      return {
        ok: false,
        code: 'FORBIDDEN',
        message:
          'L\'acompte est calculé depuis les encaissements (ledger). Utilisez un paiement ou Administration → Synchronisation (force).',
      };
    }
  }

  if (statut !== undefined && statut !== before.statut) {
    const targetStatut = normalizeCommandeStatut(statut);
    if (!isCommandeStatut(targetStatut)) {
      return { ok: false, code: 'BAD_REQUEST', message: 'Statut invalide' };
    }

    const tr = await transitionCommandeStatut(id, targetStatut, {
      userId: ctx.userId,
      userName: ctx.userName,
      force: Boolean(force) && ['admin', 'manager'].includes(ctx.role),
    });

    if (tr.error === 'VALIDATION') {
      return { ok: false, code: 'VALIDATION', message: tr.validation.message };
    }
    if (tr.error) {
      return { ok: false, code: 'BAD_REQUEST', message: 'Mise à jour impossible' };
    }

    const extra: Record<string, unknown> = {};
    if (input.priorite !== undefined) extra.priorite = input.priorite;
    if (input.operateur !== undefined) extra.operateur = input.operateur;
    if (input.machine !== undefined) extra.machine = input.machine;
    if (input.note !== undefined) extra.note = input.note;
    if (input.dateLiv !== undefined) extra.dateLiv = input.dateLiv ? new Date(input.dateLiv) : null;
    // acompte manuel uniquement si pas de ledger (déjà traité plus haut)
    if (avancement !== undefined) extra.avancement = Math.max(tr.commande.avancement, avancement);

    const commande = Object.keys(extra).length > 0
      ? await commandesRepository.update(id, extra)
      : await commandesRepository.findByIdWithListInclude(id);

    if (!commande) return { ok: false, code: 'NOT_FOUND', message: 'Commande introuvable' };

    return {
      ok: true,
      commande,
      before,
      audit: {
        action: 'STATUS_CHANGE',
        oldValue: { statut: before.statut, avancement: before.avancement },
        newValue: { statut: commande.statut, avancement: commande.avancement },
      },
      notify: {
        title: 'Commande mise à jour',
        message: `${commande.numero} → ${commande.statut}`,
        type: commande.statut === CommandeStatut.Annulee ? 'warning' : 'info',
      },
    };
  }

  if (Object.keys(updateData).length === 0 && avancement === undefined) {
    return { ok: true, noop: true, commande: before };
  }

  if (avancement !== undefined) {
    updateData.avancement = Math.max(before.avancement, avancement);
  }

  const commande = await commandesRepository.update(id, updateData);

  return {
    ok: true,
    commande,
    before,
    audit: {
      action: 'UPDATE',
      oldValue: {
        statut: before.statut,
        avancement: before.avancement,
        priorite: before.priorite,
        acompte: before.acompte,
      },
      newValue: {
        statut: commande.statut,
        avancement: commande.avancement,
        priorite: commande.priorite,
        acompte: commande.acompte,
      },
    },
  };
}

export type CommandeListQuery = {
  search: string;
  statut: string;
  resteAPayer: boolean;
  urgente: boolean;
  from?: Date;
  to?: Date;
  trash?: boolean;
  paginate: boolean;
  pagination: PaginationParams;
  summary: boolean;
};

export function parseCommandeListQuery(searchParams: URLSearchParams): CommandeListQuery {
  const { from, to } = parseApiDateRange(searchParams);
  return {
    search: searchParams.get('search') || '',
    statut: searchParams.get('statut') || '',
    resteAPayer: searchParams.get('resteAPayer') === '1',
    urgente: searchParams.get('urgente') === '1',
    from,
    to,
    trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
    paginate: wantsPagination(searchParams),
    pagination: parsePagination(searchParams),
    summary: searchParams.get('summary') === '1',
  };
}

export async function getCommandesSummary(dateRange?: { from?: Date; to?: Date }) {
  const where: Record<string, unknown> = {};
  if (dateRange?.from || dateRange?.to) {
    where.createdAt = {
      ...(dateRange.from ? { gte: dateRange.from } : {}),
      ...(dateRange.to ? { lte: dateRange.to } : {}),
    };
  }

  const fullRows = await prisma.commande.findMany({
    where,
    select: { id: true, statut: true, dateLiv: true, total: true, priorite: true },
  });
  const paymentTotals = await batchCommandePaymentTotals(
    fullRows.map((c) => ({ id: c.id, total: c.total })),
  );

  const now = new Date();
  const done = new Set(completedCommandeStatuts());
  const inProgress = new Set(activeProductionCommandeStatuts());
  const cancelled = new Set(cancelledCommandeStatuts());

  let resteAPayer = 0;
  let resteAPayerCount = 0;
  for (const c of fullRows) {
    if (cancelled.has(c.statut as never)) continue;
    const reste = paymentTotals.get(c.id)?.reste ?? 0;
    if (reste > 0.01) {
      resteAPayerCount += 1;
      resteAPayer += reste;
    }
  }

  const activeRows = fullRows.filter((c) => !cancelled.has(c.statut as never));

  return {
    total: fullRows.length,
    enCours: fullRows.filter((c) => inProgress.has(c.statut)).length,
    enRetard: fullRows.filter(
      (c) =>
        c.statut === CommandeStatut.En_retard || (c.dateLiv && c.dateLiv < now && !done.has(c.statut)),
    ).length,
    aPlanifier: fullRows.filter((c) => c.statut === CommandeStatut.A_planifier).length,
    livrees: fullRows.filter((c) => c.statut === CommandeStatut.Livre || c.statut === CommandeStatut.Livree).length,
    caTotal: activeRows.reduce((s, c) => s + (c.total || 0), 0),
    resteAPayer,
    urgentes: activeRows.filter((c) => c.priorite === 'Urgente').length,
    resteAPayerCount,
  };
}

async function resolveCommandeListWhere(query: Omit<CommandeListQuery, 'summary'>) {
  const base = {
    search: query.search || undefined,
    statut: query.statut || undefined,
    urgente: query.urgente,
    createdFrom: query.from,
    createdTo: query.to,
    trash: query.trash,
  };

  if (!query.resteAPayer) {
    return buildCommandeWhere(base);
  }

  const candidates = await commandesRepository.findIdsAndTotals(buildCommandeWhere(base));
  const ids = await findCommandeIdsWithResteAPayer(candidates);
  return buildCommandeWhere({ ...base, ids });
}

export async function listCommandes(query: Omit<CommandeListQuery, 'summary'>) {
  const where = await resolveCommandeListWhere(query);

  const commandes = await commandesRepository.findManyEnriched(
    where,
    query.paginate ? { skip: query.pagination.skip, take: query.pagination.take } : undefined,
  );

  const paymentTotals = await batchCommandePaymentTotals(
    commandes.map((c) => ({ id: c.id, total: c.total })),
  );

  const enriched = commandes.map((c) => {
    const serialized = serializeCommandeForApi(
      applyPaymentTotalsToCommande(c, paymentTotals),
    );
    return {
      ...serialized,
      nextAction: resolveCommandeListNextAction(serialized),
    };
  });

  if (query.paginate) {
    const total = await commandesRepository.count(where);
    return paginatedResult(enriched, total, query.pagination);
  }
  return enriched;
}

export async function getCommandeDetail(id: string) {
  const commande = await commandesRepository.findByIdWithDetail(id);
  if (!commande) return null;
  const serialized = serializeCommandeForApi(commande);
  const totals = await batchCommandePaymentTotals([{ id: serialized.id, total: serialized.total }]);
  return applyPaymentTotalsToCommande(serialized, totals);
}
