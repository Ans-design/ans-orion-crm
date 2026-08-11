import { prisma } from '@/lib/prisma';

export async function listAdvances(filters?: { employeeId?: string; statut?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.statut && filters.statut !== 'tous') where.statut = filters.statut;

  return prisma.employeeAdvance.findMany({
    where,
    orderBy: { dateAvance: 'desc' },
    include: {
      employee: { select: { id: true, matricule: true, firstName: true, lastName: true, poste: true } },
    },
  });
}

export async function getPendingAdvanceTotal(employeeId: string): Promise<number> {
  const rows = await prisma.employeeAdvance.findMany({
    where: { employeeId, statut: 'en_cours' },
    select: { montant: true },
  });
  return rows.reduce((s, r) => s + r.montant, 0);
}

export async function createAdvance(data: {
  employeeId: string;
  montant: number;
  motif?: string;
  createdBy?: string;
}) {
  return prisma.employeeAdvance.create({
    data: {
      employeeId: data.employeeId,
      montant: data.montant,
      motif: data.motif,
      createdBy: data.createdBy,
      statut: 'en_cours',
    },
    include: {
      employee: { select: { id: true, matricule: true, firstName: true, lastName: true } },
    },
  });
}

export async function settleAdvance(id: string) {
  return prisma.employeeAdvance.update({
    where: { id },
    data: { statut: 'rembourse', rembourseAt: new Date() },
  });
}

export async function cancelAdvance(id: string) {
  return prisma.employeeAdvance.update({
    where: { id },
    data: { statut: 'annule' },
  });
}

export async function getAdvanceStats() {
  const [enCours, totalMontant] = await Promise.all([
    prisma.employeeAdvance.count({ where: { statut: 'en_cours' } }),
    prisma.employeeAdvance.aggregate({
      where: { statut: 'en_cours' },
      _sum: { montant: true },
    }),
  ]);
  return { enCours, montantTotal: totalMontant._sum.montant ?? 0 };
}
