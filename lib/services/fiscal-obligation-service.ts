import { FactureStatut } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeFiscalDeductions } from '@/lib/fiscal-config';
import { getFiscalConfig } from '@/lib/services/fiscal-config-service';
import { createNotification } from '@/lib/services/notification-service';

const ALERT_DAYS = [7, 1];

function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function currentPeriode() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export async function listFiscalObligations(filters?: { statut?: string; type?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.statut && filters.statut !== 'tous') where.statut = filters.statut;
  if (filters?.type && filters.type !== 'tous') where.type = filters.type;

  return prisma.fiscalObligation.findMany({
    where,
    orderBy: { dateEcheance: 'asc' },
    take: 200,
  });
}

export async function createFiscalObligation(data: {
  type: string;
  label: string;
  periode: string;
  dateEcheance: Date;
  montant?: number;
  notes?: string;
  createdBy?: string;
}) {
  return prisma.fiscalObligation.create({
    data: {
      type: data.type,
      label: data.label.trim(),
      periode: data.periode.trim(),
      dateEcheance: data.dateEcheance,
      montant: data.montant ?? 0,
      notes: data.notes?.trim() || null,
      createdBy: data.createdBy ?? null,
      statut: 'a_preparer',
    },
  });
}

export async function updateFiscalObligation(
  id: string,
  data: Partial<{
    type: string;
    label: string;
    periode: string;
    dateEcheance: Date;
    montant: number;
    statut: string;
    notes: string;
    documentKey: string;
  }>,
) {
  return prisma.fiscalObligation.update({ where: { id }, data });
}

export async function getFiscalObligationStats() {
  const today = startOfToday();
  const [aPreparer, enCours, enRetard, deposees] = await Promise.all([
    prisma.fiscalObligation.count({ where: { statut: 'a_preparer' } }),
    prisma.fiscalObligation.count({ where: { statut: 'en_cours' } }),
    prisma.fiscalObligation.count({
      where: {
        statut: { in: ['a_preparer', 'en_cours'] },
        dateEcheance: { lt: today },
      },
    }),
    prisma.fiscalObligation.count({ where: { statut: 'depose' } }),
  ]);
  return { aPreparer, enCours, enRetard, deposees, ouvertes: aPreparer + enCours };
}

/**
 * Snapshot période courante — taux Backoffice + montants issus factures émises / paie active.
 * Estimations clairement dérivées des données ORION (pas de règles fiscales inventées).
 */
export async function getFiscalDashboardSnapshot() {
  const fiscal = await getFiscalConfig();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periode = currentPeriode();

  const [factureAgg, employees] = await Promise.all([
    prisma.facture.aggregate({
      where: {
        statut: { notIn: [FactureStatut.Annulee, FactureStatut.Brouillon] },
        OR: [
          { dateEmission: { gte: monthStart } },
          { AND: [{ dateEmission: null }, { createdAt: { gte: monthStart } }] },
        ],
      },
      _sum: { totalHT: true, totalTTC: true },
      _count: true,
    }),
    prisma.employee.findMany({
      where: { statut: 'Actif' },
      select: {
        salaireBaseMGA: true,
        notesFraisMGA: true,
        heuresSup: true,
        primeMGA: true,
      },
    }),
  ]);

  let irsa = 0;
  let cnaps = 0;
  let ostie = 0;
  let fmfp = 0;
  for (const e of employees) {
    const brut =
      e.salaireBaseMGA +
      e.notesFraisMGA +
      e.heuresSup * fiscal.hsRateMGA +
      e.primeMGA;
    const d = computeFiscalDeductions(brut, fiscal);
    irsa += d.irsa;
    cnaps += d.cnaps;
    ostie += d.ostie;
    fmfp += d.fmfp;
  }

  const caHT = Math.round(factureAgg._sum.totalHT ?? 0);
  const caTTC = Math.round(factureAgg._sum.totalTTC ?? 0);
  const tvaCollectee = Math.max(0, caTTC - caHT);

  return {
    periode,
    rates: {
      tva: fiscal.tvaRate,
      irsa: fiscal.irsaRate,
      cnaps: fiscal.cnapsRate,
      ostie: fiscal.ostieRate,
      fmfp: fiscal.fmfpRate,
      labelCnaps: fiscal.labelCnaps,
      labelOstie: fiscal.labelOstie,
      currency: fiscal.currency,
    },
    facturesMois: {
      count: factureAgg._count,
      caHT,
      caTTC,
      tvaCollectee,
    },
    paieMois: {
      employesActifs: employees.length,
      irsa,
      cnaps,
      ostie,
      fmfp,
      total: irsa + cnaps + ostie + fmfp,
    },
  };
}

/** Rappels J-7 / J-1 pour obligations non déposées. */
export async function notifyUpcomingFiscalDeadlines() {
  const now = new Date();
  const obligations = await prisma.fiscalObligation.findMany({
    where: { statut: { in: ['a_preparer', 'en_cours'] } },
    take: 50,
  });

  for (const ob of obligations) {
    const daysLeft = Math.ceil((ob.dateEcheance.getTime() - now.getTime()) / 86400000);
    if (!ALERT_DAYS.includes(daysLeft)) continue;
    await createNotification({
      title: `Échéance fiscale J-${daysLeft}`,
      message: `${ob.label} (${ob.periode}) — ${ob.montant.toLocaleString('fr-FR')} Ar`,
      link: '/finance/fiscalite',
      type: daysLeft <= 1 ? 'warning' : 'info',
    });
  }
}
