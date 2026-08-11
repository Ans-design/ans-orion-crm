import { prisma } from '@/lib/prisma';
import { cancelledCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { getLiveCreancesTotal, sumEncaissementsInRange } from '@/lib/finance/kpi-live-aggregates';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';
import { assertDebitAllowed } from '@/lib/services/stock-quantity';
import { adjustStock } from '@/lib/services/stock-service';
import { roundMga } from '@/lib/pricing/mga-round';

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

type DateRange = { from?: Date; to?: Date };

function rangeWhere(field: 'dateCharge' | 'datePaiement' | 'soldAt', range?: DateRange) {
  if (!range?.from && !range?.to) return undefined;
  return {
    [field]: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

export async function listFinanceCharges(limit = 100) {
  return prisma.financeCharge.findMany({
    orderBy: { dateCharge: 'desc' },
    take: limit,
  });
}

export async function createFinanceCharge(data: {
  label: string;
  category?: string;
  amount: number;
  dateCharge?: Date;
  supplierRef?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
}) {
  const charge = await prisma.financeCharge.create({
    data: {
      label: data.label.trim(),
      category: data.category ?? 'Exploitation',
      amount: data.amount,
      dateCharge: data.dateCharge ?? new Date(),
      supplierRef: data.supplierRef?.trim() || null,
      notes: data.notes?.trim() || null,
      createdById: data.createdById ?? null,
      createdByName: data.createdByName ?? null,
    },
  });
  invalidateKpiCaches();
  return charge;
}

export async function listStockDirectSales(limit = 50) {
  return prisma.stockDirectSale.findMany({
    orderBy: { soldAt: 'desc' },
    take: limit,
    include: {
      stockItem: { select: { id: true, sku: true, label: true } },
      client: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function createStockDirectSale(data: {
  stockItemId?: string | null;
  label: string;
  quantity: number;
  unitPrice: number;
  clientId?: string | null;
  mode?: string;
  notes?: string | null;
  soldByName?: string | null;
}) {
  const total = roundMga(data.quantity * data.unitPrice);

  const sale = await prisma.$transaction(async (tx) => {
    if (data.stockItemId) {
      const item = await tx.stockItem.findUnique({ where: { id: data.stockItemId } });
      if (!item) throw new Error('Article stock introuvable');
      assertDebitAllowed(item, data.quantity);
    }

    const created = await tx.stockDirectSale.create({
      data: {
        stockItemId: data.stockItemId ?? null,
        label: data.label.trim(),
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        total,
        clientId: data.clientId ?? null,
        mode: data.mode ?? 'Espèces',
        notes: data.notes?.trim() || null,
        soldByName: data.soldByName ?? null,
      },
    });

    if (data.stockItemId) {
      await adjustStock(
        {
          stockItemId: data.stockItemId,
          type: 'sortie',
          movementType: 'vente_directe',
          quantity: Math.abs(data.quantity),
          reference: `VD-${created.id}`,
          notes: data.label,
          userName: data.soldByName ?? undefined,
        },
        tx,
      );
    }

    return created;
  });

  if (data.stockItemId) {
    try {
      const { syncMaterialFromStockItem } = await import(
        '@/lib/server/modules/materials/material-stock-sync.service'
      );
      await syncMaterialFromStockItem(data.stockItemId);
    } catch { /* ignore */ }
  }

  invalidateKpiCaches();
  return sale;
}

export async function getCoutsRevient(limit = 30, dateRange?: DateRange) {
  const commandeWhere = dateRange?.from || dateRange?.to
    ? {
        statut: { notIn: cancelledCommandeStatuts() },
        createdAt: {
          ...(dateRange.from ? { gte: dateRange.from } : {}),
          ...(dateRange.to ? { lte: dateRange.to } : {}),
        },
      }
    : { statut: { notIn: cancelledCommandeStatuts() } };
  const commandes = await prisma.commande.findMany({
    where: commandeWhere,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      numero: true,
      article: true,
      total: true,
      statut: true,
      client: { select: { name: true } },
    },
  });

  const monthCharges = await prisma.financeCharge.aggregate({
    where: rangeWhere('dateCharge', dateRange) ?? { dateCharge: { gte: monthStart() } },
    _sum: { amount: true },
  });
  const chargeMensuelle = monthCharges._sum.amount ?? 0;
  const overheadPerCmd = commandes.length > 0 ? chargeMensuelle / commandes.length : 0;

  return commandes.map((c) => {
    const coutEstime = c.total * 0.62 + overheadPerCmd;
    const marge = c.total - coutEstime;
    const margePct = c.total > 0 ? Math.round((marge / c.total) * 100) : 0;
    return {
      commandeId: c.id,
      numero: c.numero,
      client: c.client?.name ?? '—',
      article: c.article,
      statut: c.statut,
      ca: c.total,
      coutRevient: Math.round(coutEstime),
      marge: Math.round(marge),
      margePct,
    };
  });
}

export async function getFinanceAdvStats(dateRange?: DateRange) {
  const paiementWhere = rangeWhere('datePaiement', dateRange) ?? { datePaiement: { gte: monthStart() } };
  const chargeWhere = rangeWhere('dateCharge', dateRange) ?? { dateCharge: { gte: monthStart() } };
  const saleWhere = rangeWhere('soldAt', dateRange) ?? { soldAt: { gte: monthStart() } };

  const [encaissementsNet, charges, ventesDirectes, impayes] = await Promise.all([
    sumEncaissementsInRange(paiementWhere),
    prisma.financeCharge.aggregate({
      where: chargeWhere,
      _sum: { amount: true },
    }),
    prisma.stockDirectSale.aggregate({
      where: saleWhere,
      _sum: { total: true },
      _count: true,
    }),
    getLiveCreancesTotal(),
  ]);

  const entrees = encaissementsNet + (ventesDirectes._sum.total ?? 0);
  const sorties = charges._sum.amount ?? 0;
  const tresorerie = entrees - sorties;

  return {
    entreesMois: entrees,
    sortiesMois: sorties,
    tresorerieMois: tresorerie,
    ventesDirectesMois: ventesDirectes._sum.total ?? 0,
    ventesDirectesCount: ventesDirectes._count,
    chargesMois: sorties,
    impayes,
  };
}
