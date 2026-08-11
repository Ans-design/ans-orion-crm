import { prisma } from '@/lib/prisma';
import type { PrismaTx } from '@/lib/services/SequenceService';
import type { StockCheckInput, StockCheckResult, StockStatus } from './StockAvailabilityService';
import { checkStockAvailabilitySimulated } from './StockAvailabilityService';
import {
  assertDebitAllowed,
  assertStockQuantityConsistency,
  buildMovementIdempotencyWhere,
  computeNextStockQuantity,
  computeStockAfterReservationConsume,
  resolveMovementDeltaKind,
  stockAvailable,
} from './stock-quantity';

export { stockAvailable } from './stock-quantity';

const LOW_STOCK_THRESHOLD = 50;

function normalizeGrammage(g: string): string {
  return g.replace(/\s*g\s*$/i, '').trim() + 'g';
}

function normalizePaperType(p: string): string {
  const s = p.trim();
  if (/^offset/i.test(s)) return 'Offset';
  if (/^pcb/i.test(s)) return 'PCB';
  if (/^pcm/i.test(s)) return 'PCM';
  if (/^bristol/i.test(s)) return 'Bristol';
  return s;
}

/** Recherche article stock papier par type + grammage */
export async function findPaperStockItem(paperType: string, grammage: string, tx?: PrismaTx) {
  const pt = normalizePaperType(paperType);
  const gr = normalizeGrammage(grammage);
  const client = tx ?? prisma;
  return client.stockItem.findFirst({
    where: {
      actif: true,
      category: 'Papier',
      paperType: pt,
      grammage: gr,
    },
  });
}

export async function checkStockAvailabilityReal(input: StockCheckInput): Promise<StockCheckResult | null> {
  const config = input.configuration ?? {};
  const paperType = String(config.paperType || config.matiere || '').trim();
  const grammage = String(config.paperWeight || config.grammage || '').trim();

  if (paperType && grammage && !grammage.toLowerCase().includes('personnalisé')) {
    const item = await findPaperStockItem(paperType, grammage);
    if (item) return buildStockCheckResult(item, input);
  }

  const articleId = input.articleId ?? '';
  if (articleId.startsWith('gf-') || articleId === 'gf-bache') {
    const matiere = String(
      config.matiere || config.material || config.typeBache || config.laize || config.bacheType || '',
    ).trim();
    const candidates = [matiere, articleId.replace(/^gf-/, ''), articleId].filter(Boolean);
    for (const key of candidates) {
      const gfItem = await findGrandFormatStockItem(key);
      if (gfItem) return buildStockCheckResult(gfItem, input);
    }
  }

  return null;
}

function buildStockCheckResult(
  item: { quantity: number; reservedQty?: number | null; minQty: number; unit: string },
  input: StockCheckInput,
): StockCheckResult {
  const qty = Math.max(1, input.quantity ?? 1);
  const available = stockAvailable(item);
  const isManager = ['admin', 'manager'].includes(input.userRole ?? '');

  let status: StockStatus = 'AVAILABLE';
  if (available <= 0) status = 'OUT_OF_STOCK';
  else if (qty > available) status = 'PARTIAL_OUT_OF_STOCK';
  else if (available <= item.minQty || available <= LOW_STOCK_THRESHOLD) status = 'LOW_STOCK';

  const messages: Record<StockStatus, string> = {
    AVAILABLE: `En stock — ${Math.floor(available)} ${item.unit}(s) disponibles`,
    LOW_STOCK: `Stock faible — ${Math.floor(available)} ${item.unit}(s) restantes (seuil ${Math.floor(item.minQty)})`,
    PARTIAL_OUT_OF_STOCK: `Quantité demandée (${qty}) > stock (${Math.floor(available)})`,
    OUT_OF_STOCK: 'Rupture de stock pour cette matière',
    ON_DEMAND: '',
    DISABLED: '',
    UNKNOWN: 'Vérification stock indisponible',
  };

  const blocked = status === 'OUT_OF_STOCK' || status === 'PARTIAL_OUT_OF_STOCK';

  return {
    status,
    canAddToCart: !blocked || isManager,
    canCreateQuote: !blocked || isManager,
    canCreateOrder: !blocked || isManager,
    requiresManagerApproval: blocked && !isManager,
    message: messages[status],
    estimatedDelayDays: status === 'OUT_OF_STOCK' ? 7 : undefined,
  };
}

/** Stock réel si trouvé, sinon simulation legacy */
export async function resolveStockAvailability(input: StockCheckInput): Promise<StockCheckResult> {
  try {
    const real = await checkStockAvailabilityReal(input);
    if (real) return real;
  } catch (err) {
    console.error('[stock-service]', err);
  }
  return checkStockAvailabilitySimulated(input);
}

export async function adjustStock(params: {
  stockItemId: string;
  type: 'entree' | 'sortie' | 'ajustement';
  /** Type enregistré dans StockMovement (retour, perte, production, vente_directe…) */
  movementType?: string;
  quantity: number;
  userId?: string;
  userName?: string;
  notes?: string;
  reference?: string;
  commandeId?: string;
}, tx?: PrismaTx) {
  const movementLabel = params.movementType ?? params.type;

  const run = async (client: PrismaTx) => {
    const item = await client.stockItem.findUnique({ where: { id: params.stockItemId } });
    if (!item) throw new Error('Article stock introuvable');

    const kindPreview = resolveMovementDeltaKind(movementLabel, params.type);
    // Sorties / ajustements métier : référence obligatoire (anti double-clic / retry réseau)
    let effectiveReference = params.reference?.trim() || undefined;
    if ((kindPreview === 'sortie' || movementLabel === 'vente_directe') && !effectiveReference) {
      if (params.commandeId) {
        effectiveReference = `${movementLabel}:${params.commandeId}:${Math.abs(params.quantity)}`;
      } else {
        throw new Error('Référence obligatoire pour une sortie stock (anti-doublon)');
      }
    }

    const idemWhere = buildMovementIdempotencyWhere({
      stockItemId: params.stockItemId,
      type: movementLabel,
      quantity: params.quantity,
      reference: effectiveReference,
      commandeId: params.commandeId,
    });
    if (idemWhere) {
      const existing = await client.stockMovement.findFirst({ where: idemWhere });
      if (existing) {
        // Replay sûr : même référence / type / qty (/ commande) → pas de double débit
        return item;
      }
    }

    const kind = resolveMovementDeltaKind(movementLabel, params.type);
    const absQty = Math.abs(params.quantity);

    /** Sortie : update conditionnel disponible (anti-oversell concurrent). */
    if (kind === 'sortie' && typeof client.$executeRaw === 'function') {
      assertDebitAllowed(item, absQty);
      const affected = await client.$executeRaw`
        UPDATE StockItem
        SET quantity = quantity - ${absQty}
        WHERE id = ${params.stockItemId}
          AND (quantity - COALESCE(reservedQty, 0)) >= ${absQty}
      `;
      if (Number(affected) === 0) {
        throw new Error('Stock disponible insuffisant');
      }
      const row = await client.stockItem.findUniqueOrThrow({ where: { id: params.stockItemId } });
      await client.stockMovement.create({
        data: {
          stockItemId: params.stockItemId,
          type: movementLabel,
          quantity: absQty,
          balanceAfter: row.quantity,
          reference: effectiveReference,
          commandeId: params.commandeId,
          userId: params.userId,
          userName: params.userName,
          notes: params.notes,
        },
      });
      return row;
    }

    const newQty = computeNextStockQuantity(
      item.quantity,
      params.type,
      params.quantity,
      movementLabel,
    );
    assertStockQuantityConsistency(item, newQty);

    const row = await client.stockItem.update({
      where: { id: params.stockItemId },
      data: { quantity: newQty },
    });
    await client.stockMovement.create({
      data: {
        stockItemId: params.stockItemId,
        type: movementLabel,
        quantity: absQty,
        balanceAfter: newQty,
        reference: effectiveReference,
        commandeId: params.commandeId,
        userId: params.userId,
        userName: params.userName,
        notes: params.notes,
      },
    });
    return row;
  };

  const updated = tx ? await run(tx) : await prisma.$transaction(run);

  // Une transaction externe doit committer avant la sync, afin que celle-ci
  // lise les nouvelles quantités. Son appelant prend alors la sync en charge.
  if (!tx) {
    try {
      const { syncMaterialFromStockItem } = await import(
        '@/lib/server/modules/materials/material-stock-sync.service'
      );
      await syncMaterialFromStockItem(params.stockItemId);
    } catch {
      /* ignore sync errors */
    }
  }

  return updated;
}

/** Seuil critique : dispo (qty − réservé) ≤ minQty — aligné production/POS. */
const LOW_STOCK_SQL =
  `SELECT COUNT(*) as c FROM StockItem WHERE actif = 1 AND archived = 0 AND (quantity - COALESCE(reservedQty, 0)) <= minQty`;

export async function getStockAlerts() {
  try {
    return await prisma.$queryRaw<
      { id: string; label: string; sku: string; quantity: number; reservedQty: number; minQty: number; category: string }[]
    >`
      SELECT id, label, sku, quantity, reservedQty, minQty, category
      FROM StockItem
      WHERE actif = 1
        AND archived = 0
        AND (quantity - COALESCE(reservedQty, 0)) <= minQty
    `;
  } catch {
    const items = await prisma.stockItem.findMany({
      where: { actif: true, archived: false },
      select: {
        id: true, label: true, sku: true, quantity: true, reservedQty: true, minQty: true, category: true,
      },
    });
    return items.filter((i) => stockAvailable(i) <= i.minQty);
  }
}

/** Compte les lignes en alerte stock (même règle que getStockAlerts). */
export async function countLowStockItems(): Promise<number> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(LOW_STOCK_SQL);
    return Number(rows[0]?.c ?? 0);
  } catch {
    return (await getStockAlerts()).length;
  }
}

/** Recherche stock grand format par article normalisé */
export async function findGrandFormatStockItem(materialKey: string, tx?: PrismaTx) {
  const key = materialKey.trim();
  const client = tx ?? prisma;
  return client.stockItem.findFirst({
    where: {
      actif: true,
      category: 'GrandFormat',
      OR: [
        { materialKey: key },
        { label: key },
        { label: { contains: key } },
        { materialKey: { contains: key } },
      ],
    },
  });
}

/** Réserve du stock pour une commande (sans sortie définitive) */
export async function reserveStock(
  params: {
    stockItemId: string;
    quantity: number;
    commandeId?: string;
    devisId?: string;
    unit?: string;
    notes?: string;
    reference?: string;
  },
  tx?: PrismaTx,
) {
  const run = async (client: PrismaTx) => {
    const item = await client.stockItem.findUnique({ where: { id: params.stockItemId } });
    if (!item) throw new Error('Article stock introuvable');

    // Idempotence : une réservation active par article × commande
    if (params.commandeId) {
      const existing = await client.stockReservation.findFirst({
        where: {
          stockItemId: params.stockItemId,
          commandeId: params.commandeId,
          status: 'active',
        },
      });
      if (existing) {
        if (Math.abs(existing.quantity - params.quantity) > 1e-9) {
          throw new Error(
            'Réservation active déjà présente pour cette commande (quantité différente)',
          );
        }
        return existing;
      }
    }

    assertDebitAllowed(item, params.quantity);

    let updated;
    if (typeof client.$executeRaw === 'function') {
      const affected = await client.$executeRaw`
        UPDATE StockItem
        SET reservedQty = COALESCE(reservedQty, 0) + ${params.quantity}
        WHERE id = ${params.stockItemId}
          AND (quantity - COALESCE(reservedQty, 0)) >= ${params.quantity}
      `;
      if (Number(affected) === 0) {
        throw new Error('Stock disponible insuffisant');
      }
      updated = await client.stockItem.findUniqueOrThrow({
        where: { id: params.stockItemId },
      });
    } else {
      updated = await client.stockItem.update({
        where: { id: params.stockItemId },
        data: { reservedQty: { increment: params.quantity } },
      });
    }
    const reservation = await client.stockReservation.create({
      data: {
        stockItemId: params.stockItemId,
        commandeId: params.commandeId ?? null,
        devisId: params.devisId ?? null,
        quantity: params.quantity,
        unit: params.unit ?? item.unit,
        status: 'active',
      },
    });
    await client.stockMovement.create({
      data: {
        stockItemId: params.stockItemId,
        type: 'reservation',
        quantity: params.quantity,
        balanceAfter: stockAvailable(updated),
        commandeId: params.commandeId,
        reference: params.reference,
        notes: params.notes ?? 'Réservation commande',
      },
    });
    return reservation;
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/**
 * Libère une réservation active (annulation commande / timeout).
 * Idempotent si déjà `released`.
 */
export async function releaseStockReservation(
  params: {
    reservationId?: string;
    stockItemId?: string;
    commandeId?: string;
    notes?: string;
    reference?: string;
    userId?: string;
    userName?: string;
  },
  tx?: PrismaTx,
) {
  const run = async (client: PrismaTx) => {
    let reservation = null as Awaited<
      ReturnType<typeof client.stockReservation.findFirst>
    >;

    if (params.reservationId) {
      reservation = await client.stockReservation.findUnique({
        where: { id: params.reservationId },
      });
    } else if (params.stockItemId && params.commandeId) {
      reservation = await client.stockReservation.findFirst({
        where: {
          stockItemId: params.stockItemId,
          commandeId: params.commandeId,
          status: 'active',
        },
      });
    } else {
      throw new Error('reservationId ou (stockItemId + commandeId) requis');
    }

    if (!reservation) throw new Error('Réservation introuvable');
    if (reservation.status !== 'active') {
      return reservation; // déjà libérée / consommée
    }

    const item = await client.stockItem.findUnique({ where: { id: reservation.stockItemId } });
    if (!item) throw new Error('Article stock introuvable');

    const nextReserved = Math.max(0, (item.reservedQty ?? 0) - reservation.quantity);
    await client.stockItem.update({
      where: { id: reservation.stockItemId },
      data: { reservedQty: nextReserved },
    });

    const updated = await client.stockReservation.update({
      where: { id: reservation.id },
      data: { status: 'released', releasedAt: new Date() },
    });

    await client.stockMovement.create({
      data: {
        stockItemId: reservation.stockItemId,
        type: 'annulation_reservation',
        quantity: reservation.quantity,
        balanceAfter: stockAvailable({ quantity: item.quantity, reservedQty: nextReserved }),
        commandeId: reservation.commandeId,
        reference: params.reference,
        userId: params.userId,
        userName: params.userName,
        notes: params.notes ?? 'Libération réservation',
      },
    });

    return updated;
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/** Libère toutes les réservations actives d’une commande. */
export async function releaseReservationsForCommande(
  commandeId: string,
  opts?: { notes?: string; reference?: string; userId?: string; userName?: string },
  tx?: PrismaTx,
) {
  const run = async (client: PrismaTx) => {
    const active = await client.stockReservation.findMany({
      where: { commandeId, status: 'active' },
    });
    const results = [];
    for (const r of active) {
      results.push(
        await releaseStockReservation(
          {
            reservationId: r.id,
            notes: opts?.notes,
            reference: opts?.reference,
            userId: opts?.userId,
            userName: opts?.userName,
          },
          client,
        ),
      );
    }
    return results;
  };
  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/**
 * Consomme une réservation active (fin production) :
 * débit `quantity` + baisse `reservedQty` + mouvement `production`.
 * Idempotent si déjà `consumed` (ou mouvement `PROD-CONSUME-{id}`).
 */
export async function consumeStockReservation(
  params: {
    reservationId?: string;
    stockItemId?: string;
    commandeId?: string;
    notes?: string;
    reference?: string;
    userId?: string;
    userName?: string;
  },
  tx?: PrismaTx,
) {
  const run = async (client: PrismaTx) => {
    let reservation = null as Awaited<
      ReturnType<typeof client.stockReservation.findFirst>
    >;

    if (params.reservationId) {
      reservation = await client.stockReservation.findUnique({
        where: { id: params.reservationId },
      });
    } else if (params.stockItemId && params.commandeId) {
      reservation = await client.stockReservation.findFirst({
        where: {
          stockItemId: params.stockItemId,
          commandeId: params.commandeId,
          status: 'active',
        },
      });
    } else {
      throw new Error('reservationId ou (stockItemId + commandeId) requis');
    }

    if (!reservation) throw new Error('Réservation introuvable');
    if (reservation.status === 'consumed') return reservation;
    if (reservation.status !== 'active') {
      throw new Error(`Réservation non consommable (statut: ${reservation.status})`);
    }

    const reference = params.reference ?? `PROD-CONSUME-${reservation.id}`;
    const existingMvt = await client.stockMovement.findFirst({
      where: {
        stockItemId: reservation.stockItemId,
        type: 'production',
        reference,
        ...(reservation.commandeId ? { commandeId: reservation.commandeId } : {}),
      },
    });
    if (existingMvt) {
      return client.stockReservation.update({
        where: { id: reservation.id },
        data: { status: 'consumed', releasedAt: reservation.releasedAt ?? new Date() },
      });
    }

    const item = await client.stockItem.findUnique({ where: { id: reservation.stockItemId } });
    if (!item) throw new Error('Article stock introuvable');

    const next = computeStockAfterReservationConsume(item, reservation.quantity);
    await client.stockItem.update({
      where: { id: reservation.stockItemId },
      data: { quantity: next.quantity, reservedQty: next.reservedQty },
    });

    const updated = await client.stockReservation.update({
      where: { id: reservation.id },
      data: { status: 'consumed', releasedAt: new Date() },
    });

    await client.stockMovement.create({
      data: {
        stockItemId: reservation.stockItemId,
        type: 'production',
        quantity: reservation.quantity,
        balanceAfter: next.quantity,
        commandeId: reservation.commandeId,
        reference,
        userId: params.userId,
        userName: params.userName,
        notes: params.notes ?? 'Consommation production',
      },
    });

    return updated;
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/** Consomme toutes les réservations actives d’une commande (fin production). */
export async function consumeReservationsForCommande(
  commandeId: string,
  opts?: { notes?: string; reference?: string; userId?: string; userName?: string },
  tx?: PrismaTx,
) {
  const run = async (client: PrismaTx) => {
    const active = await client.stockReservation.findMany({
      where: { commandeId, status: 'active' },
    });
    const results = [];
    for (const r of active) {
      results.push(
        await consumeStockReservation(
          {
            reservationId: r.id,
            notes: opts?.notes,
            reference: opts?.reference ? `${opts.reference}-${r.id}` : undefined,
            userId: opts?.userId,
            userName: opts?.userName,
          },
          client,
        ),
      );
    }
    return results;
  };
  if (tx) return run(tx);
  return prisma.$transaction(run);
}
