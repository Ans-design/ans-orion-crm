import { CATALOGUE } from '@/lib/data/catalogue';
import { prisma } from '@/lib/prisma';
import { getConfigHealth } from '@/lib/services/admin-config';
import { getDynamicPricingStats } from '@/lib/pricing/publish-dynamic-pricing';
import type { CatalogDriftReport } from '@/lib/admin-config/catalog-drift';
import { batchCommandePaymentTotals } from '@/lib/server/modules/commandes/commandes-payment-totals';
import { syncCommandePaiementTotals } from '@/lib/services/facture-workflow-service';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';
import { completedCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';

export type SyncDriftAlert = {
  id: string;
  source:
    | 'config-catalogue'
    | 'catalogue-db'
    | 'pricing-publish'
    | 'payment-truth'
    | 'formules-rules'
    | 'stock-material'
    | 'bat-gpao'
    | 'talk-commande'
    | 'production-kanban';
  severity: 'info' | 'warn' | 'critical';
  title: string;
  message: string;
  href: string;
  count: number;
  details?: string[];
};

export type SyncDriftReport = {
  alerts: SyncDriftAlert[];
  totalScore: number;
  configDrift: CatalogDriftReport | null;
  catalogueDb: {
    catalogueCount: number;
    dbProfileCount: number;
    missingInDb: number;
    orphanInDb: number;
    sampleMissing: string[];
  } | null;
  pricing: {
    published: number;
    draft: number;
    withoutProfile: number;
  } | null;
  checkedAt: string;
  dbUnavailable?: boolean;
  /** Alertes masquées via « Ignorer 24h » (non affichées, hors score) */
  ignoredCount?: number;
};

const DRIFT_STATE_KEY = 'sync_drift_alert_state';
const DRIFT_IGNORED_KEY = 'sync_drift_ignored_alerts';

type IgnoredAlertsState = { byId?: Record<string, string> };

/** IDs d’alertes encore ignorées (TTL 24h) */
export async function getIgnoredSyncDriftAlertIds(): Promise<Set<string>> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { configKey: DRIFT_IGNORED_KEY },
    });
    const byId = (row?.data as IgnoredAlertsState | undefined)?.byId ?? {};
    const now = Date.now();
    const active = new Set<string>();
    const next: Record<string, string> = {};
    let dirty = false;
    for (const [id, until] of Object.entries(byId)) {
      if (new Date(until).getTime() > now) {
        active.add(id);
        next[id] = until;
      } else {
        dirty = true;
      }
    }
    if (dirty) {
      await prisma.systemConfig.upsert({
        where: { configKey: DRIFT_IGNORED_KEY },
        create: { configKey: DRIFT_IGNORED_KEY, data: { byId: next } },
        update: { data: { byId: next } },
      });
    }
    return active;
  } catch {
    return new Set();
  }
}

/** Masque une alerte drift pendant `hours` (défaut 24h, max 7 j) */
export async function ignoreSyncDriftAlert(alertId: string, hours = 24) {
  const safeHours = Math.min(168, Math.max(1, Math.round(hours)));
  const until = new Date(Date.now() + safeHours * 60 * 60 * 1000).toISOString();
  const existing = await prisma.systemConfig.findUnique({
    where: { configKey: DRIFT_IGNORED_KEY },
  });
  const prev = (existing?.data as IgnoredAlertsState | undefined)?.byId ?? {};
  const byId = { ...prev, [alertId]: until };
  await prisma.systemConfig.upsert({
    where: { configKey: DRIFT_IGNORED_KEY },
    create: { configKey: DRIFT_IGNORED_KEY, data: { byId } },
    update: { data: { byId } },
  });
  return { alertId, until, hours: safeHours };
}

function scoreFromAlerts(alerts: SyncDriftAlert[]): number {
  return alerts.reduce((n, a) => n + (a.severity === 'critical' ? 3 : a.severity === 'warn' ? 2 : 1), 0);
}

/** Articles catalogue statique absents des profils DB tarifaires */
export async function detectCatalogueDbDrift() {
  const catalogueIds = CATALOGUE.map((c) => c.id);
  const rows = await prisma.articlePricingProfile.findMany({ select: { articleId: true } });
  const inDb = new Set(rows.map((r) => r.articleId));
  const catalogueSet = new Set(catalogueIds);

  const missingInDb = catalogueIds.filter((id) => !inDb.has(id));
  const orphanInDb = rows.map((r) => r.articleId).filter((id) => !catalogueSet.has(id));

  return {
    catalogueCount: catalogueIds.length,
    dbProfileCount: rows.length,
    missingInDb: missingInDb.length,
    orphanInDb: orphanInDb.length,
    sampleMissing: missingInDb.slice(0, 12),
    totalDrift: missingInDb.length + orphanInDb.length,
  };
}

function isDbUnavailableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /Can't reach database|ECONNREFUSED|connect ECONNREFUSED|P1001|P1000|database server/i.test(msg);
}

/** Ariary = entiers — écart ≥ 1 Ar détecté. */
const PAYMENT_DRIFT_EPSILON = 0;

/** Écarts acompte/reste DB vs paiements réels */
export async function detectPaymentDrift(limit = 150) {
  const commandes = await prisma.commande.findMany({
    where: { statut: { not: 'Annulee' } },
    select: { id: true, numero: true, total: true, acompte: true, reste: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  if (commandes.length === 0) return { mismatchCount: 0, samples: [] as string[] };

  const totals = await batchCommandePaymentTotals(commandes);
  const mismatches = commandes.filter((c) => {
    const t = totals.get(c.id);
    if (!t) return false;
    return (
      Math.abs((c.acompte ?? 0) - t.acompte) > PAYMENT_DRIFT_EPSILON
      || Math.abs((c.reste ?? 0) - t.reste) > PAYMENT_DRIFT_EPSILON
    );
  });

  return {
    mismatchCount: mismatches.length,
    samples: mismatches.slice(0, 8).map(
      (c) => `${c.numero} — DB acompte ${c.acompte ?? 0} vs réel ${totals.get(c.id)?.acompte ?? 0}`,
    ),
    commandeIds: mismatches.map((c) => c.id),
  };
}

/** Stock lié à une matière absente / orpheline (Lot E4). */
export async function detectStockMaterialDrift(limit = 80) {
  const linked = await prisma.stockItem.findMany({
    where: { actif: true, archived: false, baseMaterialId: { not: null } },
    select: { id: true, sku: true, label: true, baseMaterialId: true },
    take: limit,
  });
  const materialIds = [...new Set(linked.map((i) => i.baseMaterialId!).filter(Boolean))];
  const materials = materialIds.length
    ? await prisma.baseMaterial.findMany({
        where: { id: { in: materialIds } },
        select: { id: true },
      })
    : [];
  const ok = new Set(materials.map((m) => m.id));
  const orphanLinks = linked.filter((i) => i.baseMaterialId && !ok.has(i.baseMaterialId));

  const unlinkedCritical = await prisma.stockItem.count({
    where: {
      actif: true,
      archived: false,
      baseMaterialId: null,
      stockCategory: { in: ['matiere_interne', 'hybride'] },
      quantity: { gt: 0 },
    },
  });

  return {
    orphanLinkCount: orphanLinks.length,
    unlinkedMaterialStock: unlinkedCritical,
    samples: orphanLinks.slice(0, 8).map((i) => `${i.sku} → matière ${i.baseMaterialId} introuvable`),
  };
}

/** BAT validé sans jalon GPAO aligné (Lot E4). */
export async function detectBatGpaoDrift(limit = 60) {
  const proofs = await prisma.proof.findMany({
    where: { statut: { in: ['Validé', 'Verrouillé'] }, commandeId: { not: null } },
    select: { id: true, numero: true, commandeId: true, statut: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  const cmdIds = [...new Set(proofs.map((p) => p.commandeId!).filter(Boolean))];
  if (cmdIds.length === 0) return { mismatchCount: 0, samples: [] as string[] };

  const dossiers = await prisma.productionDossier.findMany({
    where: { commandeId: { in: cmdIds } },
    select: { commandeId: true, statutGlobal: true },
  });
  const byCmd = new Map(dossiers.map((d) => [d.commandeId, d.statutGlobal]));

  const GPAO_OK_AFTER_BAT = new Set([
    'BAT validé',
    'Prêt impression',
    'Impression en cours',
    'Impression terminée',
    'En production',
    'En finition',
    'Prêt livraison',
    'Livré',
    'Terminé',
  ]);

  const mismatches = proofs.filter((p) => {
    const st = byCmd.get(p.commandeId!);
    if (!st) return true;
    if (GPAO_OK_AFTER_BAT.has(st)) return false;
    if (st.includes('BAT validé') || st.includes('production') || st.includes('Impression')) return false;
    return true;
  });

  return {
    mismatchCount: mismatches.length,
    samples: mismatches.slice(0, 8).map((p) => {
      const st = byCmd.get(p.commandeId!) ?? 'sans dossier';
      return `${p.numero} validé → GPAO « ${st} »`;
    }),
  };
}

/**
 * ANS Talk ↔ Commande :
 * - conversations order avec commandeId orphelin
 * - commandes actives récentes sans groupe Talk
 */
export async function detectTalkCommandeDrift(limit = 120) {
  const talks = await prisma.talkConversation.findMany({
    where: { type: 'order', commandeId: { not: null } },
    select: { id: true, name: true, commandeId: true },
    take: 400,
  });
  const linkedIds = [...new Set(talks.map((t) => t.commandeId!).filter(Boolean))];
  const existingCmds = linkedIds.length
    ? await prisma.commande.findMany({ where: { id: { in: linkedIds } }, select: { id: true } })
    : [];
  const existingSet = new Set(existingCmds.map((c) => c.id));
  const orphans = talks.filter((t) => t.commandeId && !existingSet.has(t.commandeId));

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const openCmds = await prisma.commande.findMany({
    where: {
      statut: { notIn: [...completedCommandeStatuts()] },
      createdAt: { gte: since },
    },
    select: { id: true, numero: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  const openIds = openCmds.map((c) => c.id);
  const talksForOpen = openIds.length
    ? await prisma.talkConversation.findMany({
        where: { commandeId: { in: openIds } },
        select: { commandeId: true },
      })
    : [];
  const hasTalk = new Set(talksForOpen.map((t) => t.commandeId).filter(Boolean));
  const missingTalk = openCmds.filter((c) => !hasTalk.has(c.id));

  return {
    orphanCount: orphans.length,
    missingTalkCount: missingTalk.length,
    samples: [
      ...orphans.slice(0, 4).map((t) => `Talk « ${t.name} » → commande absente`),
      ...missingTalk.slice(0, 4).map((c) => `CMD ${c.numero} sans groupe Talk`),
    ],
  };
}

/**
 * Double modèle Lot E1 : Production (kanban) ↔ ProductionDossier (GPAO).
 * Liens cassés, OF actifs sans dossier, écarts de statut Terminé.
 */
export async function detectProductionKanbanGpaoDrift(limit = 100) {
  const dossiers = await prisma.productionDossier.findMany({
    where: { productionId: { not: null } },
    select: { id: true, productionId: true, statutGlobal: true, commande: { select: { numero: true } } },
    take: 400,
  });
  const prodIds = [...new Set(dossiers.map((d) => d.productionId!).filter(Boolean))];
  const prods = prodIds.length
    ? await prisma.production.findMany({
        where: { id: { in: prodIds } },
        select: { id: true, statut: true },
      })
    : [];
  const byId = new Map(prods.map((p) => [p.id, p]));
  const brokenLinks = dossiers.filter((d) => d.productionId && !byId.has(d.productionId));

  const statusMismatch: string[] = [];
  for (const d of dossiers) {
    const p = d.productionId ? byId.get(d.productionId) : undefined;
    if (!p) continue;
    const dDone = /termin|livr|clos/i.test(d.statutGlobal);
    const pDone = /termin|livr/i.test(p.statut);
    if (dDone !== pDone) {
      statusMismatch.push(
        `CMD ${d.commande.numero} · dossier=${d.statutGlobal} · kanban=${p.statut}`,
      );
    }
  }

  const orphanKanban = await prisma.production.findMany({
    where: {
      statut: { notIn: ['Terminé', 'Livré', 'Annulé'] },
      dossier: null,
    },
    select: { id: true, statut: true, commande: { select: { numero: true } } },
    take: limit,
  });

  return {
    brokenLinkCount: brokenLinks.length,
    orphanKanbanCount: orphanKanban.length,
    statusMismatchCount: statusMismatch.length,
    samples: [
      ...brokenLinks
        .slice(0, 4)
        .map((d) => `CMD ${d.commande.numero} · lien Production ${d.productionId} absent`),
      ...orphanKanban
        .slice(0, 4)
        .map((p) => `Kanban CMD ${p.commande.numero} (${p.statut}) sans dossier GPAO`),
      ...statusMismatch.slice(0, 4),
    ],
  };
}

/** Resynchronise acompte/reste depuis le ledger paiements pour les commandes en écart. */
export async function repairPaymentDrift(limit = 150) {
  const drift = await detectPaymentDrift(limit);
  if (drift.mismatchCount === 0) {
    return { repaired: 0, remaining: 0, samples: [] as string[] };
  }

  let repaired = 0;
  for (const commandeId of drift.commandeIds ?? []) {
    await syncCommandePaiementTotals(commandeId);
    repaired += 1;
  }

  const after = await detectPaymentDrift(limit);
  if (repaired > 0) invalidateKpiCaches();
  return {
    repaired,
    remaining: after.mismatchCount,
    samples: after.samples,
  };
}

/** Analyse complète des écarts de synchronisation */
export async function runFullSyncDriftAnalysis(): Promise<SyncDriftReport> {
  const alerts: SyncDriftAlert[] = [];
  let configDrift: CatalogDriftReport | null = null;
  let catalogueDb: SyncDriftReport['catalogueDb'] = null;
  let pricing: SyncDriftReport['pricing'] = null;
  let dbUnavailable = false;

  try {
    const health = await getConfigHealth();
    configDrift = health.catalogDrift ?? null;
    const drift = configDrift?.totalDrift ?? 0;
    if (drift > 0) {
      alerts.push({
        id: 'config-catalogue',
        source: 'config-catalogue',
        severity: drift >= 5 ? 'critical' : 'warn',
        title: 'Config admin ↔ catalogue code',
        message: `${drift} écart(s) entre le brouillon admin et le catalogue source`,
        href: '/administration/synchronisation',
        count: drift,
        details: configDrift?.details?.slice(0, 5),
      });
    }
  } catch (error) {
    const severity = isDbUnavailableError(error) ? 'warn' as const : 'critical' as const;
    if (isDbUnavailableError(error)) dbUnavailable = true;
    alerts.push({
      id: 'config-catalogue-error',
      source: 'config-catalogue',
      severity,
      title: dbUnavailable ? 'Base de données indisponible' : 'Config admin indisponible',
      message: dbUnavailable
        ? 'Connexion DB impossible — démarrer PostgreSQL ou utiliser DATABASE_URL SQLite (npm run dev:local)'
        : 'Impossible de calculer le drift catalogue config',
      href: '/administration/sante-systeme',
      count: 1,
    });
  }

  try {
    const db = await detectCatalogueDbDrift();
    catalogueDb = {
      catalogueCount: db.catalogueCount,
      dbProfileCount: db.dbProfileCount,
      missingInDb: db.missingInDb,
      orphanInDb: db.orphanInDb,
      sampleMissing: db.sampleMissing,
    };
    if (db.missingInDb > 0) {
      alerts.push({
        id: 'catalogue-db-missing',
        source: 'catalogue-db',
        severity: db.missingInDb >= 10 ? 'critical' : 'warn',
        title: 'Catalogue → profils DB',
        message: `${db.missingInDb} article(s) catalogue sans profil tarifaire en base`,
        href: '/administration/synchronisation',
        count: db.missingInDb,
        details: db.sampleMissing.map((id) => `Manquant : ${id}`),
      });
    }
    if (db.orphanInDb > 0) {
      alerts.push({
        id: 'catalogue-db-orphan',
        source: 'catalogue-db',
        severity: 'info',
        title: 'Profils DB orphelins',
        message: `${db.orphanInDb} profil(s) DB sans entrée catalogue statique`,
        href: '/administration/catalogue-articles',
        count: db.orphanInDb,
      });
    }
  } catch {
    /* DB optionnelle en dev */
  }

  try {
    const stats = await getDynamicPricingStats();
    const published = stats?.published ?? 0;
    const draft = stats?.draft ?? 0;
    const withoutProfile = Math.max(0, CATALOGUE.length - (published + draft));
    pricing = { published, draft, withoutProfile };
    if (published === 0 && CATALOGUE.length > 0) {
      alerts.push({
        id: 'pricing-none-published',
        source: 'pricing-publish',
        severity: 'critical',
        title: 'Aucun profil publié POS',
        message: 'Le moteur dynamique n\'a aucun profil publié — POS / devis à risque',
        href: '/administration/vue-ensemble',
        count: CATALOGUE.length,
      });
    } else if (withoutProfile > 5) {
      alerts.push({
        id: 'pricing-gap',
        source: 'pricing-publish',
        severity: 'warn',
        title: 'Articles sans profil moteur',
        message: `Environ ${withoutProfile} article(s) catalogue sans profil tarifaire actif`,
        href: '/administration/catalogue-articles',
        count: withoutProfile,
      });
    }
  } catch (error) {
    if (isDbUnavailableError(error)) dbUnavailable = true;
    /* pricing stats indisponibles si DB down */
  }

  try {
    const rawRules = await prisma.businessRule.count({ where: { active: true } });
    // Templates multi-articles (force-price, filter…) gonflent le compte vs vue Formules fusionnée.
    const templateLike = await prisma.businessRule.count({
      where: {
        active: true,
        OR: [
          { ruleKey: { contains: '-force-price' } },
          { ruleKey: { contains: '-filter' } },
          { ruleKey: { contains: '-palette' } },
          { ruleKey: { contains: '-compat' } },
          { ruleKey: { contains: '-show' } },
          { ruleKey: { endsWith: '-qty-min' } },
        ],
      },
    });
    if (rawRules > 80 && templateLike > 40) {
      const fusedEstimate = Math.max(1, rawRules - templateLike + 8);
      const gap = rawRules - fusedEstimate;
      if (gap >= 50) {
        alerts.push({
          id: 'formules-rules-inflate',
          source: 'formules-rules',
          severity: 'info',
          title: 'Règles DB vs vue Formules',
          message: `${rawRules} lignes DB (dont ~${templateLike} templates article) → vue fusionnée Formules ~${fusedEstimate}. Miroir audit, pas moteur POS.`,
          href: '/administration/catalogue-prix-stock',
          count: gap,
        });
      }
    }
  } catch {
    /* BusinessRule optionnel */
  }

  try {
    const paymentDrift = await detectPaymentDrift();
    if (paymentDrift.mismatchCount > 0) {
      alerts.push({
        id: 'payment-acompte-mismatch',
        source: 'payment-truth',
        severity: paymentDrift.mismatchCount >= 5 ? 'critical' : 'warn',
        title: 'Paiements ↔ commandes désalignés',
        message: `${paymentDrift.mismatchCount} commande(s) avec acompte/reste DB ≠ encaissements réels`,
        href: '/administration/synchronisation',
        count: paymentDrift.mismatchCount,
        details: paymentDrift.samples,
      });
    }
  } catch {
    /* payment drift optionnel */
  }

  try {
    const stockMat = await detectStockMaterialDrift();
    if (stockMat.orphanLinkCount > 0) {
      alerts.push({
        id: 'stock-material-orphan',
        source: 'stock-material',
        severity: stockMat.orphanLinkCount >= 5 ? 'critical' : 'warn',
        title: 'Stock ↔ BaseMaterial orphelin',
        message: `${stockMat.orphanLinkCount} stock(s) liés à une matière absente`,
        href: '/stock',
        count: stockMat.orphanLinkCount,
        details: stockMat.samples,
      });
    } else if (stockMat.unlinkedMaterialStock > 20) {
      alerts.push({
        id: 'stock-material-unlinked',
        source: 'stock-material',
        severity: 'info',
        title: 'Stocks matières sans liaison',
        message: `${stockMat.unlinkedMaterialStock} article(s) matière sans BaseMaterial — lier via fiche stock`,
        href: '/stock',
        count: stockMat.unlinkedMaterialStock,
      });
    }
  } catch {
    /* stock-material optionnel */
  }

  try {
    const batGpao = await detectBatGpaoDrift();
    if (batGpao.mismatchCount > 0) {
      alerts.push({
        id: 'bat-gpao-mismatch',
        source: 'bat-gpao',
        severity: batGpao.mismatchCount >= 5 ? 'critical' : 'warn',
        title: 'BAT validé ↔ GPAO',
        message: `${batGpao.mismatchCount} BAT validé(s) sans jalon GPAO cohérent`,
        href: '/production/dossiers',
        count: batGpao.mismatchCount,
        details: batGpao.samples,
      });
    }
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      alerts.push({
        id: 'bat-gpao-error',
        source: 'bat-gpao',
        severity: 'warn',
        title: 'Drift BAT ↔ GPAO non calculable',
        message: 'Erreur lors de la vérification BAT / GPAO',
        href: '/administration/synchronisation',
        count: 1,
      });
    }
  }

  try {
    const talkDrift = await detectTalkCommandeDrift();
    if (talkDrift.orphanCount > 0) {
      alerts.push({
        id: 'talk-commande-orphan',
        source: 'talk-commande',
        severity: talkDrift.orphanCount >= 5 ? 'critical' : 'warn',
        title: 'ANS Talk → commande orpheline',
        message: `${talkDrift.orphanCount} conversation(s) order liées à une commande absente`,
        href: '/messagerie',
        count: talkDrift.orphanCount,
        details: talkDrift.samples.filter((s) => s.includes('absente')),
      });
    }
    if (talkDrift.missingTalkCount > 0) {
      alerts.push({
        id: 'talk-commande-missing',
        source: 'talk-commande',
        severity: talkDrift.missingTalkCount >= 10 ? 'warn' : 'info',
        title: 'Commande active sans groupe Talk',
        message: `${talkDrift.missingTalkCount} commande(s) ouverte(s) sans conversation ANS Talk (90 j)`,
        href: '/administration/synchronisation',
        count: talkDrift.missingTalkCount,
        details: talkDrift.samples.filter((s) => s.includes('sans groupe')),
      });
    }
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      alerts.push({
        id: 'talk-commande-error',
        source: 'talk-commande',
        severity: 'warn',
        title: 'Drift Talk ↔ commande non calculable',
        message: 'Erreur lors de la vérification ANS Talk / commandes',
        href: '/administration/synchronisation',
        count: 1,
      });
    }
  }

  try {
    const kanban = await detectProductionKanbanGpaoDrift();
    if (kanban.brokenLinkCount > 0) {
      alerts.push({
        id: 'production-kanban-broken-link',
        source: 'production-kanban',
        severity: kanban.brokenLinkCount >= 5 ? 'critical' : 'warn',
        title: 'GPAO → Production orpheline',
        message: `${kanban.brokenLinkCount} dossier(s) liés à une Production absente`,
        href: '/production/dossiers',
        count: kanban.brokenLinkCount,
        details: kanban.samples.filter((s) => s.includes('lien Production')),
      });
    }
    if (kanban.orphanKanbanCount > 0) {
      alerts.push({
        id: 'production-kanban-orphan',
        source: 'production-kanban',
        severity: kanban.orphanKanbanCount >= 10 ? 'warn' : 'info',
        title: 'Kanban Production sans dossier GPAO',
        message: `${kanban.orphanKanbanCount} OF actif(s) sans ProductionDossier lié`,
        href: '/production',
        count: kanban.orphanKanbanCount,
        details: kanban.samples.filter((s) => s.includes('sans dossier')),
      });
    }
    if (kanban.statusMismatchCount > 0) {
      alerts.push({
        id: 'production-kanban-status',
        source: 'production-kanban',
        severity: kanban.statusMismatchCount >= 8 ? 'warn' : 'info',
        title: 'Statut Kanban ↔ GPAO divergent',
        message: `${kanban.statusMismatchCount} couple(s) Terminé/non-terminé désaligné(s)`,
        href: '/administration/synchronisation',
        count: kanban.statusMismatchCount,
        details: kanban.samples.filter((s) => s.includes('dossier=')),
      });
    }
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      alerts.push({
        id: 'production-kanban-error',
        source: 'production-kanban',
        severity: 'warn',
        title: 'Drift Kanban ↔ GPAO non calculable',
        message: 'Erreur lors de la vérification Production / dossiers',
        href: '/administration/synchronisation',
        count: 1,
      });
    }
  }

  if (dbUnavailable && pricing?.published === 0) {
    const idx = alerts.findIndex((a) => a.id === 'pricing-none-published');
    if (idx >= 0) {
      alerts[idx] = {
        ...alerts[idx]!,
        severity: 'warn',
        title: 'Prix POS non vérifiables',
        message: 'Base indisponible — impossible de confirmer les profils publiés',
      };
    }
  }

  const ignoredIds = await getIgnoredSyncDriftAlertIds();
  const visible = ignoredIds.size
    ? alerts.filter((a) => !ignoredIds.has(a.id))
    : alerts;
  const ignoredCount = alerts.length - visible.length;

  return {
    alerts: visible,
    totalScore: scoreFromAlerts(visible),
    configDrift,
    catalogueDb,
    pricing,
    checkedAt: new Date().toISOString(),
    dbUnavailable: dbUnavailable || undefined,
    ignoredCount: ignoredCount > 0 ? ignoredCount : undefined,
  };
}

export type SyncDriftSummary = {
  totalScore: number;
  criticalCount: number;
  warnCount: number;
  ok: boolean;
  checkedAt: string;
  topAlerts: Pick<SyncDriftAlert, 'id' | 'severity' | 'title' | 'message' | 'href'>[];
};

/** Résumé léger pour réponses API post-publication */
export function summarizeSyncDriftReport(report: SyncDriftReport): SyncDriftSummary {
  const criticalCount = report.alerts.filter((a) => a.severity === 'critical').length;
  const warnCount = report.alerts.filter((a) => a.severity === 'warn').length;
  return {
    totalScore: report.totalScore,
    criticalCount,
    warnCount,
    ok: criticalCount === 0 && !report.dbUnavailable,
    checkedAt: report.checkedAt,
    topAlerts: report.alerts.slice(0, 5).map(({ id, severity, title, message, href }) => ({
      id,
      severity,
      title,
      message,
      href,
    })),
  };
}

/** Notifications admin si drift significatif — dédoublonnage 24h */
export async function notifySyncDriftIfNeeded(): Promise<{ notified: boolean; report: SyncDriftReport }> {
  const report = await runFullSyncDriftAnalysis();
  if (report.totalScore === 0) {
    return { notified: false, report };
  }

  const fingerprint = report.alerts.map((a) => `${a.id}:${a.count}`).join('|');
  let shouldNotify = true;

  try {
    const existing = await prisma.systemConfig.findUnique({
      where: { configKey: DRIFT_STATE_KEY },
    });
    const prev = existing?.data as { fingerprint?: string; at?: string } | undefined;
    if (prev?.fingerprint === fingerprint && prev.at) {
      const age = Date.now() - new Date(prev.at).getTime();
      if (age < 24 * 60 * 60 * 1000) shouldNotify = false;
    }
  } catch {
    /* continue */
  }

  if (!shouldNotify) {
    return { notified: false, report };
  }

  const top = report.alerts.sort((a, b) => {
    const w = { critical: 3, warn: 2, info: 1 };
    return w[b.severity] - w[a.severity];
  })[0];

  if (top) {
    const { createNotification } = await import('@/lib/services/notification-service');
    await createNotification({
      title: 'Écart synchronisation détecté',
      message: top.message,
      link: top.href,
      type: top.severity === 'critical' ? 'error' : 'warning',
    });
  }

  try {
    await prisma.systemConfig.upsert({
      where: { configKey: DRIFT_STATE_KEY },
      create: {
        configKey: DRIFT_STATE_KEY,
        data: { fingerprint, at: new Date().toISOString(), score: report.totalScore },
      },
      update: {
        data: { fingerprint, at: new Date().toISOString(), score: report.totalScore },
      },
    });
  } catch {
    /* ignore */
  }

  return { notified: true, report };
}

/** Alertes ticker bandeau cockpit */
export async function getSyncDriftTickerAlerts(): Promise<
  { type: string; label: string; href: string; severity: 'info' | 'warn' | 'critical' }[]
> {
  const report = await runFullSyncDriftAnalysis();
  return report.alerts
    .filter((a) => a.severity !== 'info')
    .slice(0, 3)
    .map((a) => ({
      type: 'sync-drift',
      label: `Sync : ${a.message}`,
      href: a.href,
      severity: a.severity,
    }));
}
