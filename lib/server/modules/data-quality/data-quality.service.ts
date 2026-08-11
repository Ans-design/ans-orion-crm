import { prisma } from '@/lib/server/db/prisma';

import { unpaidFactureStatuts, acceptedDevisStatut, devisExpiryWatchStatuts } from '@/lib/server/data/prisma-statut-bridge';

import { DATA_QUALITY_RULES, type DataQualitySeverity } from './data-quality.rules';

import { Prisma } from '@prisma/client';



export type DataQualityAnomaly = {

  ruleId: string;

  module: string;

  label: string;

  severity: DataQualitySeverity;

  count: number;

  sampleIds: string[];

  fixHint?: string;

};



export type DataQualityReport = {

  scannedAt: string;

  totalAnomalies: number;

  bySeverity: Record<DataQualitySeverity, number>;

  anomalies: DataQualityAnomaly[];

};



const SAMPLE_LIMIT = 5;



type ScanHit = { count: number; sampleIds: string[] };



async function countAndSample(

  countFn: () => Promise<number>,

  sampleFn: () => Promise<{ id: string }[]>,

): Promise<ScanHit> {

  const count = await countFn();

  if (count === 0) return { count: 0, sampleIds: [] };

  const samples = await sampleFn();

  return { count, sampleIds: samples.map((s) => s.id) };

}



export async function runDataQualityScan(): Promise<DataQualityReport> {

  const now = new Date();



  const [

    clientsNoPhone,

    clientsNoNif,

    commandesNoClient,

    commandesResteNeg,

    devisNoLines,

    facturesOverdue,

    livraisonsNoAddress,

    talkOrphanCmd,

    stockNegative,

    commandesNoPaymentSnapshot,

    devisNoLogisticsSnapshot,

    devisExpiredPending,

  ] = await Promise.all([

    countAndSample(

      () => prisma.client.count({ where: { archived: false, tel: null, whatsapp: null } }),

      () =>

        prisma.client.findMany({

          where: { archived: false, tel: null, whatsapp: null },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () => prisma.client.count({ where: { archived: false, OR: [{ nif: null }, { nif: '' }] } }),

      () =>

        prisma.client.findMany({

          where: { archived: false, OR: [{ nif: null }, { nif: '' }] },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () => prisma.commande.count({ where: { clientId: null } }),

      () => prisma.commande.findMany({ where: { clientId: null }, select: { id: true }, take: SAMPLE_LIMIT }),

    ),

    countAndSample(

      () => prisma.commande.count({ where: { reste: { lt: 0 } } }),

      () => prisma.commande.findMany({ where: { reste: { lt: 0 } }, select: { id: true }, take: SAMPLE_LIMIT }),

    ),

    countAndSample(

      () => prisma.devis.count({ where: { lignes: { none: {} } } }),

      () =>

        prisma.devis.findMany({

          where: { lignes: { none: {} } },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () =>

        prisma.facture.count({

          where: {

            statut: { in: unpaidFactureStatuts() },

            dateEcheance: { lt: now },

          },

        }),

      () =>

        prisma.facture.findMany({

          where: {

            statut: { in: unpaidFactureStatuts() },

            dateEcheance: { lt: now },

          },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () => prisma.livraison.count({ where: { OR: [{ adresseLiv: null }, { adresseLiv: '' }] } }),

      () =>

        prisma.livraison.findMany({

          where: { OR: [{ adresseLiv: null }, { adresseLiv: '' }] },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () => prisma.talkConversation.count({ where: { commandeId: { not: null }, commande: null } }),

      () =>

        prisma.talkConversation.findMany({

          where: { commandeId: { not: null }, commande: null },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () => prisma.stockItem.count({ where: { quantity: { lt: 0 } } }),

      () =>

        prisma.stockItem.findMany({

          where: { quantity: { lt: 0 } },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () => prisma.commande.count({ where: { paymentSnapshot: { equals: Prisma.DbNull } } }),

      () =>

        prisma.commande.findMany({

          where: { paymentSnapshot: { equals: Prisma.DbNull } },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () =>

        prisma.devis.count({

          where: { statut: acceptedDevisStatut(), logisticsSnapshot: { equals: Prisma.DbNull } },

        }),

      () =>

        prisma.devis.findMany({

          where: { statut: acceptedDevisStatut(), logisticsSnapshot: { equals: Prisma.DbNull } },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

    countAndSample(

      () =>

        prisma.devis.count({

          where: {

            validUntil: { lt: now },

            statut: { in: devisExpiryWatchStatuts() },

          },

        }),

      () =>

        prisma.devis.findMany({

          where: {

            validUntil: { lt: now },

            statut: { in: devisExpiryWatchStatuts() },

          },

          select: { id: true },

          take: SAMPLE_LIMIT,

        }),

    ),

  ]);



  const anomalies: DataQualityAnomaly[] = [];



  const push = (ruleId: string, hit: ScanHit, fixHint?: string) => {

    if (hit.count === 0) return;

    const rule = DATA_QUALITY_RULES.find((r) => r.id === ruleId);

    if (!rule) return;

    anomalies.push({

      ruleId,

      module: rule.module,

      label: rule.label,

      severity: rule.severity,

      count: hit.count,

      sampleIds: hit.sampleIds,

      fixHint,

    });

  };



  push('client-no-phone', clientsNoPhone, 'Compléter tel ou WhatsApp sur la fiche client');

  push('client-no-nif', clientsNoNif, 'Saisir NIF ou archiver prospect');

  push('commande-no-client', commandesNoClient, 'Lier un client à la commande');

  push('commande-reste-negative', commandesResteNeg, 'Recalculer via encaissement ou correction admin');

  push('devis-no-lines', devisNoLines, 'Ajouter des lignes ou supprimer le devis vide');

  push('facture-unpaid-overdue', facturesOverdue, 'Relancer client ou enregistrer paiement');

  push('livraison-no-address', livraisonsNoAddress, 'Renseigner adresseLiv avant expédition');

  push('talk-orphan-commande', talkOrphanCmd, 'Dissocier ou recréer la commande liée');

  push('stock-negative', stockNegative, 'Corriger mouvement stock ou inventaire');

  push(

    'commande-no-payment-snapshot',

    commandesNoPaymentSnapshot,

    'Lancer le backfill snapshots depuis Gestion des données',

  );

  push(

    'devis-no-logistics-snapshot',

    devisNoLogisticsSnapshot,

    'Lancer le backfill snapshots ou compléter les notes devis',

  );

  push('devis-expired-pending', devisExpiredPending, 'Renouveler validité ou passer le devis en Refusé');



  const bySeverity: Record<DataQualitySeverity, number> = {

    critical: 0,

    high: 0,

    medium: 0,

    low: 0,

  };

  for (const a of anomalies) {

    bySeverity[a.severity] += a.count;

  }



  return {

    scannedAt: now.toISOString(),

    totalAnomalies: anomalies.reduce((s, a) => s + a.count, 0),

    bySeverity,

    anomalies,

  };

}



export type DataQualityTrendPoint = {

  scannedAt: string;

  totalAnomalies: number;

  critical: number;

  high: number;

};



export async function persistDataQualityScan(

  report: DataQualityReport,

  auth?: { userId?: string; userName?: string },

) {

  const { logAudit } = await import('@/lib/audit');

  await logAudit({

    userId: auth?.userId,

    userName: auth?.userName,

    action: 'DATA_QUALITY_SCAN',

    entity: 'DataQuality',

    entityLabel: `${report.totalAnomalies} anomalies`,

    details: {

      totalAnomalies: report.totalAnomalies,

      bySeverity: report.bySeverity,

      ruleCount: report.anomalies.length,

      scannedAt: report.scannedAt,

    },

    newValue: {

      totalAnomalies: report.totalAnomalies,

      bySeverity: report.bySeverity,

      scannedAt: report.scannedAt,

    },

  });

}



export async function getDataQualityTrend(limit = 14): Promise<DataQualityTrendPoint[]> {

  const logs = await prisma.auditLog.findMany({

    where: { action: 'DATA_QUALITY_SCAN', entity: 'DataQuality' },

    orderBy: { createdAt: 'desc' },

    take: limit,

    select: { createdAt: true, details: true, newValue: true },

  });



  return logs

    .map((log) => {

      const fromColumn =

        log.newValue && typeof log.newValue === 'object' && !Array.isArray(log.newValue)

          ? (log.newValue as Record<string, unknown>)

          : null;



      let details: { totalAnomalies?: number; bySeverity?: Record<string, number> } = {};

      if (fromColumn) {

        details = {

          totalAnomalies: fromColumn.totalAnomalies as number | undefined,

          bySeverity: fromColumn.bySeverity as Record<string, number> | undefined,

        };

      } else if (log.details) {

        try {

          details = JSON.parse(log.details);

        } catch {

          details = {};

        }

      }



      return {

        scannedAt: (fromColumn?.scannedAt as string | undefined) ?? log.createdAt.toISOString(),

        totalAnomalies: details.totalAnomalies ?? 0,

        critical: details.bySeverity?.critical ?? 0,

        high: details.bySeverity?.high ?? 0,

      };

    })

    .reverse();

}


