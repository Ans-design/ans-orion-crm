import { prisma } from '@/lib/prisma';
import { completedCommandeStatuts, materialPlanCommandeStatutLabel } from '@/lib/server/data/prisma-statut-bridge';
import { extractMaterialNeedFromConfig } from '@/lib/production/material-plan-from-config';
import { recordWasteEmployeeImpact } from '@/lib/services/employee-impact-service';

export const WASTE_CAUSES = [
  'Réglage machine',
  'Mauvais calage',
  'Papier froissé',
  'Coupe incorrecte',
  'Pliage raté',
  'Reliure défectueuse',
  'Autre',
] as const;

export const WASTE_UNITES = ['feuille', 'rame', 'ml', 'm', 'pièce'] as const;

export async function listMaterialWastes(filters?: { poste?: string; limit?: number }) {
  return prisma.materialWaste.findMany({
    where: filters?.poste ? { poste: filters.poste } : undefined,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 100,
    include: {
      commande: {
        select: { numero: true, article: true, client: { select: { name: true } } },
      },
    },
  });
}

export async function declareMaterialWaste(data: {
  matiere: string;
  quantity: number;
  unite?: string;
  cause: string;
  poste?: string;
  notes?: string | null;
  commandeId?: string | null;
  declaredBy?: string | null;
  employeeId?: string | null;
}) {
  const waste = await prisma.materialWaste.create({
    data: {
      matiere: data.matiere.trim(),
      quantity: data.quantity,
      unite: data.unite ?? 'feuille',
      cause: data.cause,
      poste: data.poste ?? 'production',
      notes: data.notes?.trim() || null,
      commandeId: data.commandeId || null,
      declaredBy: data.declaredBy || null,
      employeeId: data.employeeId || null,
    },
  });

  await recordWasteEmployeeImpact({
    wasteId: waste.id,
    matiere: waste.matiere,
    quantity: waste.quantity,
    unite: waste.unite,
    cause: waste.cause,
    employeeId: waste.employeeId,
    commandeId: waste.commandeId,
    declaredBy: waste.declaredBy,
  }).catch(() => {});

  return waste;
}

export async function getMaterialWasteStats() {
  const [total, byPoste, recent] = await Promise.all([
    prisma.materialWaste.count(),
    prisma.materialWaste.groupBy({ by: ['poste'], _count: true }),
    prisma.materialWaste.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    }),
  ]);
  return { total, byPoste, recentWeek: recent };
}

/** Besoins matières dérivés des commandes actives (configSnapshot → papier/encre). */
export async function getMaterialPlans(opts?: { commandeId?: string }) {
  const commandes = await prisma.commande.findMany({
    where: {
      statut: { notIn: [...completedCommandeStatuts()] },
      ...(opts?.commandeId ? { id: opts.commandeId } : {}),
    },
    orderBy: { dateLiv: 'asc' },
    take: 50,
    include: {
      client: { select: { name: true } },
      productions: { select: { statut: true, machine: true }, take: 1 },
    },
  });

  const commandeIds = commandes.map((c) => c.id);
  const reservations = commandeIds.length
    ? await prisma.stockReservation.findMany({
        where: {
          commandeId: { in: commandeIds },
          status: { in: ['active', 'consumed'] },
        },
        take: 200,
        select: {
          id: true,
          commandeId: true,
          quantity: true,
          status: true,
          stockItem: { select: { id: true, label: true, quantity: true, reservedQty: true, unit: true } },
        },
      })
    : [];

  const byCommande = new Map<string, typeof reservations>();
  for (const r of reservations) {
    if (!r.commandeId) continue;
    const list = byCommande.get(r.commandeId) ?? [];
    list.push(r);
    byCommande.set(r.commandeId, list);
  }

  return commandes.map((c) => {
    const need = extractMaterialNeedFromConfig(c.configSnapshot, c.qty);
    const stockMatch = (byCommande.get(c.id) ?? []).slice(0, 5).map((r) => ({
      reservationId: r.id,
      label: r.stockItem?.label ?? '—',
      qty: r.quantity,
      status: r.status,
      available: (r.stockItem?.quantity ?? 0) - (r.stockItem?.reservedQty ?? 0),
      unit: r.stockItem?.unit ?? '',
      stockItemId: r.stockItem?.id ?? null,
    }));
    return {
      id: c.id,
      cmdId: c.numero,
      client: c.client?.name ?? '—',
      art: c.article,
      qty: c.qty,
      papier: need.papier,
      qtePapier: need.qtePapier,
      encre: need.encre,
      qteEncre: need.qteEncre,
      matieres: need.matieres,
      stockMatch,
      machine: c.machine ?? c.productions[0]?.machine ?? '—',
      temps: '—',
      statut: materialPlanCommandeStatutLabel(c.statut),
    };
  });
}
