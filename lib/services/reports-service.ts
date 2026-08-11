import { prisma } from '@/lib/prisma';
import { DevisStatut, FactureStatut } from '@prisma/client';
import { DEFAULT_FISCAL } from '@/lib/fiscal-config';
import { unpaidFactureStatuts } from '@/lib/server/data/prisma-statut-bridge';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type ReportPeriod = 'day' | 'week' | 'month' | 'year';

function periodStart(period: ReportPeriod, ref = new Date()): Date {
  const d = startOfDay(ref);
  if (period === 'day') return d;
  if (period === 'week') {
    const w = new Date(d);
    w.setDate(w.getDate() - 6);
    return w;
  }
  if (period === 'month') return new Date(ref.getFullYear(), ref.getMonth(), 1);
  return new Date(ref.getFullYear(), 0, 1);
}

export async function getBusinessReport(period: ReportPeriod = 'month') {
  const from = periodStart(period);
  const ref = new Date();
  const prevYearFrom = period === 'year'
    ? new Date(ref.getFullYear() - 1, 0, 1)
    : null;
  const prevYearTo = period === 'year'
    ? new Date(ref.getFullYear() - 1, 11, 31, 23, 59, 59)
    : null;

  const [
    paiementsAgg,
    commandesAgg,
    commandesByStatut,
    devisAgg,
    devisAcceptes,
    facturesAgg,
    achatsAgg,
    stockCritique,
    charges,
    employees,
    avancesAgg,
    creances,
    paiementsAnneePrecedente,
    livraisonsAgg,
    paiementsByMode,
  ] = await Promise.all([
    prisma.paiement.aggregate({
      where: { datePaiement: { gte: from }, type: { not: 'Remboursement' } },
      _sum: { montant: true },
      _count: true,
    }),
    prisma.commande.aggregate({
      where: { createdAt: { gte: from } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.commande.groupBy({
      by: ['statut'],
      where: { createdAt: { gte: from } },
      _count: true,
    }),
    prisma.devis.aggregate({
      where: { createdAt: { gte: from } },
      _count: true,
    }),
    prisma.devis.count({
      where: { createdAt: { gte: from }, statut: DevisStatut.Accepte },
    }),
    prisma.facture.groupBy({
      by: ['statut'],
      where: { createdAt: { gte: from } },
      _count: true,
      _sum: { totalTTC: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: { createdAt: { gte: from } },
      _sum: { totalHT: true },
      _count: true,
    }),
    prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
      `SELECT COUNT(*) as c FROM "StockItem" WHERE actif = 1 AND archived = 0 AND quantity <= minQty`,
    )
      .then((rows) => Number(rows[0]?.c ?? 0))
      .catch(() => prisma.stockItem.count({ where: { actif: true, archived: false, quantity: { lte: 0 } } })),
    prisma.financeCharge.aggregate({
      where: { dateCharge: { gte: from } },
      _sum: { amount: true },
    }),
    prisma.employee.findMany({
      where: { statut: 'Actif' },
      select: { salaireBaseMGA: true, primeMGA: true, notesFraisMGA: true, heuresSup: true },
      take: 500,
    }),
    prisma.employeeAdvance.aggregate({
      where: { statut: 'en_cours' },
      _sum: { montant: true },
      _count: true,
    }).catch(() => ({ _sum: { montant: 0 }, _count: 0 })),
    prisma.facture.findMany({
      where: { statut: { in: unpaidFactureStatuts() } },
      select: { totalTTC: true, paiements: { select: { montant: true, type: true } } },
      take: 500,
    }),
    period === 'year' && prevYearFrom && prevYearTo
      ? prisma.paiement.aggregate({
          where: { datePaiement: { gte: prevYearFrom, lte: prevYearTo }, type: { not: 'Remboursement' } },
          _sum: { montant: true },
        })
      : Promise.resolve({ _sum: { montant: 0 } }),
    prisma.livraison.groupBy({
      by: ['statut'],
      where: { createdAt: { gte: from } },
      _count: true,
      _sum: { colisCount: true },
    }),
    prisma.paiement.groupBy({
      by: ['mode'],
      where: { datePaiement: { gte: from } },
      _sum: { montant: true },
    }),
  ]);

  const refunds = await prisma.paiement.aggregate({
    where: { datePaiement: { gte: from }, type: 'Remboursement' },
    _sum: { montant: true },
  }).catch(() => ({ _sum: { montant: 0 } }));

  const caEncaisse = (paiementsAgg._sum.montant ?? 0) - (refunds._sum.montant ?? 0);
  const caCommandes = commandesAgg._sum.total ?? 0;
  const devisTotal = devisAgg._count;
  const facturesEmises = facturesAgg
    .filter((f) => f.statut !== FactureStatut.Brouillon && f.statut !== FactureStatut.Annulee)
    .reduce((s, f) => s + f._count, 0);
  const achatsTotal = achatsAgg._sum.totalHT ?? 0;
  const chargesTotal = charges._sum.amount ?? 0;

  const masseSalarialeBrute = employees.reduce(
    (s, e) => s + e.salaireBaseMGA + e.primeMGA + e.notesFraisMGA + e.heuresSup * (DEFAULT_FISCAL.hsRateMGA),
    0,
  );

  const impayes = creances.reduce((s, f) => {
    const paid = f.paiements.reduce((p, pay) => p + (pay.type === 'Remboursement' ? -pay.montant : pay.montant), 0);
    return s + Math.max(0, f.totalTTC - paid);
  }, 0);

  const caAnneePrecedente = paiementsAnneePrecedente._sum.montant ?? 0;
  const evolutionCaPct = period === 'year' && caAnneePrecedente > 0
    ? Math.round(((caEncaisse - caAnneePrecedente) / caAnneePrecedente) * 100)
    : null;

  const paiementsByModeMap: Record<string, number> = {};
  for (const p of paiementsByMode) {
    paiementsByModeMap[p.mode || 'Autre'] = (paiementsByModeMap[p.mode || 'Autre'] ?? 0) + (p._sum.montant ?? 0);
  }

  const commandesByStatutMap: Record<string, number> = {};
  for (const c of commandesByStatut) {
    commandesByStatutMap[String(c.statut)] = c._count;
  }

  const livraisonsByStatut: Record<string, number> = {};
  let colisLivres = 0;
  let livraisonsCount = 0;
  let livraisonsLivrees = 0;
  for (const l of livraisonsAgg) {
    const statutLabel = String(l.statut);
    livraisonsByStatut[statutLabel] = l._count;
    livraisonsCount += l._count;
    colisLivres += l._sum.colisCount ?? 0;
    if (statutLabel === 'Livré' || statutLabel === 'Livree' || statutLabel === 'LIVREE') {
      livraisonsLivrees += l._count;
    }
  }

  return {
    period,
    from: from.toISOString(),
    caEncaisse,
    caCommandes,
    commandesCount: commandesAgg._count,
    devisCount: devisTotal,
    devisAcceptes,
    tauxConversionDevis: devisTotal > 0 ? Math.round((devisAcceptes / devisTotal) * 100) : 0,
    facturesEmises,
    achatsTotal,
    achatsCount: achatsAgg._count,
    stockCritique,
    stockTotal: undefined,
    paiementsByMode: paiementsByModeMap,
    commandesByStatut: commandesByStatutMap,
    margeEstimee: caEncaisse - achatsTotal - chargesTotal,
    chargesTotal,
    impayes,
    masseSalarialeBrute,
    effectifActif: employees.length,
    avancesEnCours: avancesAgg._sum.montant ?? 0,
    avancesCount: typeof avancesAgg._count === 'number' ? avancesAgg._count : (avancesAgg._count as { _all?: number })?._all ?? 0,
    caAnneePrecedente: period === 'year' ? caAnneePrecedente : undefined,
    evolutionCaPct,
    livraisonsCount,
    livraisonsLivrees,
    colisLivres,
    livraisonsByStatut,
    livraisonsByCarrier: {} as Record<string, number>,
  };
}

export function reportToCsv(
  report: Awaited<ReturnType<typeof getBusinessReport>>,
  includeMargin = true,
): string {
  const lines = [
    'Rapport ANS ORION',
    `Période;${report.period}`,
    `Du;${report.from}`,
    '',
    'Indicateur;Valeur',
    `CA encaissé (Ar);${report.caEncaisse}`,
    `CA commandes (Ar);${report.caCommandes}`,
    `Commandes;${report.commandesCount}`,
    `Devis;${report.devisCount}`,
    `Devis acceptés;${report.devisAcceptes}`,
    `Taux conversion devis (%);${report.tauxConversionDevis}`,
    `Factures émises;${report.facturesEmises}`,
  ];

  if (includeMargin) {
    lines.push(
      `Achats (Ar);${report.achatsTotal}`,
      `Nombre achats;${report.achatsCount}`,
      `Charges (Ar);${report.chargesTotal ?? 0}`,
      `Marge estimée (Ar);${report.margeEstimee}`,
      `Impayés clients (Ar);${report.impayes ?? 0}`,
      `Masse salariale brute (Ar);${report.masseSalarialeBrute ?? 0}`,
      `Effectif actif;${report.effectifActif ?? 0}`,
      `Avances en cours (Ar);${report.avancesEnCours ?? 0}`,
    );
    if (report.period === 'year' && report.caAnneePrecedente != null) {
      lines.push(
        `CA année précédente (Ar);${report.caAnneePrecedente}`,
        `Évolution CA (%);${report.evolutionCaPct ?? 0}`,
      );
    }
  }

  lines.push(
    `Stock critique;${report.stockCritique}`,
    '',
    'Paiements par mode',
    ...Object.entries(report.paiementsByMode).map(([k, v]) => `${k};${v}`),
    '',
    'Commandes par statut',
    ...Object.entries(report.commandesByStatut).map(([k, v]) => `${k};${v}`),
    '',
    'Livraisons',
    `Total livraisons;${report.livraisonsCount ?? 0}`,
    `Livraisons terminées;${report.livraisonsLivrees ?? 0}`,
    `Colis livrés;${report.colisLivres ?? 0}`,
    '',
    'Livraisons par statut',
    ...Object.entries(report.livraisonsByStatut ?? {}).map(([k, v]) => `${k};${v}`),
    '',
    'Livraisons par transporteur',
    ...Object.entries(report.livraisonsByCarrier ?? {}).map(([k, v]) => `${k};${v}`),
  );

  return lines.join('\n');
}
