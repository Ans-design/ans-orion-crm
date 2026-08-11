import { getConfigHealth } from './admin-config';
import { getDynamicPricingStats } from '@/lib/pricing/publish-dynamic-pricing';
import { prisma } from '@/lib/prisma';
import { completedCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';
import {
  runFullSyncDriftAnalysis,
  type SyncDriftReport,
} from './sync-drift-service';
import { CATALOGUE } from '@/lib/data/catalogue';
import { POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';
import { computeCatalogueDbCoverage } from './catalogue-coverage';
import {
  detectWorkflowAnomalies,
  getProductionFluxConfig,
} from './production-flux-service';

export type SyncDiagnostic = {
  key: string;
  label: string;
  /** ok≈HEALTHY, warn≈DEGRADED, error≈FAILED, unknown/info≈NOT_CHECKED|UNKNOWN */
  status: 'ok' | 'info' | 'warn' | 'error' | 'unknown';
  detail?: string;
  /** Niveau honnête explicite (SYN-02 / ANO-DIAG) */
  healthLevel?: 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'UNKNOWN' | 'NOT_CHECKED';
};

export type SyncDiagnosticsBundle = {
  summary: Awaited<ReturnType<typeof getSyncStatusSummary>>;
  diagnostics: SyncDiagnostic[];
  driftReport: SyncDriftReport | null;
};

/** Cache courte pour éviter le stampede Overview + SyncCenter + Cockpit */
let diagnosticsCache: { at: number; value: SyncDiagnosticsBundle } | null = null;
const DIAGNOSTICS_TTL_MS = 12_000;

/** Statut sync config ↔ catalogue (accepte un drift déjà calculé) */
export async function getSyncStatusSummary(driftReport?: SyncDriftReport | null) {
  const [health, pricingStats, resolvedDrift, profileRows] = await Promise.all([
    getConfigHealth().catch(() => null),
    getDynamicPricingStats().catch(() => null),
    driftReport !== undefined
      ? Promise.resolve(driftReport)
      : runFullSyncDriftAnalysis().catch(() => null),
    prisma.articlePricingProfile.findMany({ select: { articleId: true } }).catch(() => []),
  ]);

  const coverage = computeCatalogueDbCoverage(
    CATALOGUE.map((a) => a.id),
    profileRows.map((r) => r.articleId),
    POS_HIDDEN_ARTICLE_IDS,
  );

  return {
    configStatus: health?.configStatus ?? 'unknown',
    pendingChanges: health?.pendingChanges ?? null,
    catalogDrift: health?.catalogDrift ?? null,
    pricingProfilesPublished: pricingStats?.published ?? 0,
    lastPublishedAt: health?.lastPublishedAt ?? null,
    posSyncRecommended: (health?.catalogDrift?.totalDrift ?? 0) > 0,
    /** null si analyse absente — ne pas afficher 0 comme « aucun drift » */
    driftScore: resolvedDrift ? resolvedDrift.totalScore : null,
    driftAlertCount: resolvedDrift ? resolvedDrift.alerts.length : null,
    driftVerified: resolvedDrift != null,
    catalogueDbMissing: resolvedDrift?.catalogueDb?.missingInDb ?? null,
    catalogueCoveragePercent: coverage.coveragePercent,
    catalogueCoverageMode: coverage.mode,
    timestamp: new Date().toISOString(),
  };
}

/** Diagnostics multi-modules (accepte un drift déjà calculé — une seule analyse) */
export async function runSyncDiagnostics(
  driftReport?: SyncDriftReport | null,
): Promise<SyncDiagnostic[]> {
  const results: SyncDiagnostic[] = [];
  const resolvedDrift =
    driftReport !== undefined
      ? driftReport
      : await runFullSyncDriftAnalysis().catch(() => null);

  if (resolvedDrift) {
    for (const alert of resolvedDrift.alerts) {
      results.push({
        key: alert.id,
        label: alert.title,
        status:
          alert.severity === 'critical'
            ? 'error'
            : alert.severity === 'warn'
              ? 'warn'
              : 'info',
        detail: alert.message,
      });
    }
  }

  // SYN-02 : drift non chargé ⇒ unknown, jamais « OK » implicite
  if (resolvedDrift === null && driftReport === undefined) {
    results.push({
      key: 'drift-analysis',
      label: 'Analyse drift',
      status: 'unknown',
      detail: 'Analyse drift non disponible — non vérifié',
    });
  } else if (resolvedDrift === null && driftReport === null) {
    results.push({
      key: 'drift-analysis',
      label: 'Analyse drift',
      status: 'unknown',
      detail: 'Échec analyse drift — état non confirmé',
    });
  }

  try {
    const health = await getConfigHealth();
    const drift = health?.catalogDrift?.totalDrift ?? 0;
    if (!results.some((r) => r.key === 'config-catalogue' || r.key === 'articles-pos')) {
      results.push({
        key: 'articles-pos',
        label: 'Articles ↔ POS',
        status: drift === 0 ? 'ok' : drift < 5 ? 'warn' : 'error',
        detail: drift === 0 ? 'Catalogue aligné' : `${drift} écart(s) catalogue`,
      });
    }
  } catch {
    if (!results.some((r) => r.key.startsWith('config') || r.key === 'articles-pos')) {
      results.push({
        key: 'articles-pos',
        label: 'Articles ↔ POS',
        status: 'unknown',
        detail: 'Config indisponible — non vérifié',
      });
    }
  }

  try {
    const [published, total, draftLines] = await Promise.all([
      prisma.articlePricingProfile.count({ where: { status: 'published' } }),
      prisma.articlePricingProfile.count(),
      prisma.devisLigne.findMany({
        where: { devis: { statut: 'Brouillon' } },
        select: { articleId: true },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
    ]);
    const articleIds = [...new Set(draftLines.map((l) => l.articleId).filter(Boolean))];
    let missingOnDraft = 0;
    if (articleIds.length > 0) {
      const pubs = await prisma.articlePricingProfile.findMany({
        where: { articleId: { in: articleIds }, status: 'published' },
        select: { articleId: true },
      });
      const pubSet = new Set(pubs.map((p) => p.articleId));
      missingOnDraft = articleIds.filter((id) => !pubSet.has(id)).length;
    }
    const status: SyncDiagnostic['status'] =
      published === 0 ? 'warn' : missingOnDraft > 0 ? 'warn' : 'ok';
    results.push({
      key: 'prix-devis',
      label: 'Prix ↔ Devis',
      status,
      detail:
        missingOnDraft > 0
          ? `${published}/${total} publiés · ${missingOnDraft} article(s) sur devis brouillon sans profil publié`
          : `${published}/${total} profils publiés · devis brouillon alignés`,
    });
  } catch {
    results.push({
      key: 'prix-devis',
      label: 'Prix ↔ Devis',
      status: 'unknown',
      detail: 'Vérification prix/devis impossible — non confirmé',
    });
  }

  try {
    const vendableWhere = {
      actif: true,
      archived: false,
      OR: [
        { vendableDirectement: true },
        { stockCategory: { in: ['vente_directe', 'hybride'] } },
      ],
    };
    const [vendable, vendableZero, vendableNoPrice, stockTotal] = await Promise.all([
      prisma.stockItem.count({ where: vendableWhere }),
      prisma.stockItem.count({ where: { ...vendableWhere, quantity: { lte: 0 } } }),
      prisma.stockItem.count({
        where: {
          AND: [
            vendableWhere,
            { OR: [{ salePrice: null }, { salePrice: { lte: 0 } }] },
          ],
        },
      }),
      prisma.stockItem.count({ where: { actif: true, archived: false } }),
    ]);
    const zeroRatioWarn = vendable > 0 && vendableZero > Math.max(5, Math.floor(vendable * 0.3));
    const status: SyncDiagnostic['status'] =
      vendable === 0 && stockTotal === 0
        ? 'warn'
        : vendableNoPrice > 0 || zeroRatioWarn
          ? 'warn'
          : 'ok';
    results.push({
      key: 'stock-pos',
      label: 'Stock ↔ POS',
      status,
      detail: `${vendable} vendable(s) / ${stockTotal} actif(s) · ${vendableZero} à qty 0 · ${vendableNoPrice} sans prix vente`,
    });
  } catch {
    results.push({
      key: 'stock-pos',
      label: 'Stock ↔ POS',
      status: 'unknown',
      detail: 'Vérification stock impossible — non confirmé',
    });
  }

  try {
    const done = [...completedCommandeStatuts()];
    const openCmd = await prisma.commande.count({
      where: { statut: { notIn: done } },
    });
    const withoutDossier = await prisma.commande.count({
      where: {
        statut: { notIn: done },
        productionDossiers: { none: {} },
      },
    });
    results.push({
      key: 'commandes-production',
      label: 'Commandes ↔ Production',
      status: withoutDossier > 0 ? 'warn' : 'ok',
      detail:
        withoutDossier > 0
          ? `${openCmd} ouverte(s) · ${withoutDossier} sans dossier GPAO`
          : `${openCmd} commande(s) ouverte(s), dossiers GPAO alignés`,
    });
  } catch {
    results.push({
      key: 'commandes-production',
      label: 'Commandes ↔ Production',
      status: 'unknown',
      detail: 'Vérification GPAO impossible — non confirmé',
    });
  }

  // Production & Flux — même source de vérité que /administration/production-flux
  try {
    const fluxConfig = await getProductionFluxConfig();
    const anomalies = detectWorkflowAnomalies(fluxConfig);
    const errors = anomalies.filter((a) => a.level === 'error').length;
    const warnings = anomalies.filter((a) => a.level === 'warning').length;
    const activeSteps = fluxConfig.steps.filter((s) => s.active).length;
    const activeTransitions = fluxConfig.transitions.filter((t) => t.active).length;
    results.push({
      key: 'production-flux',
      label: 'Production & Flux ↔ GPAO',
      status: errors > 0 ? 'error' : warnings > 0 ? 'warn' : 'ok',
      detail:
        errors > 0 || warnings > 0
          ? `${activeSteps} étapes, ${activeTransitions} transitions · ${errors} erreur(s), ${warnings} alerte(s)`
          : `${activeSteps} étapes, ${activeTransitions} transitions · flux cohérent`,
    });
  } catch {
    results.push({
      key: 'production-flux',
      label: 'Production & Flux ↔ GPAO',
      status: 'unknown',
      detail: 'Config flux indisponible',
    });
  }

  try {
    const { getPermissionSyncStats } = await import('@/lib/services/permission-admin-service');
    const { ROLE_PROFILES } = await import('@/lib/modules/role-registry');
    const { MODULE_REGISTRY } = await import('@/lib/modules/module-registry');
    const stats = await getPermissionSyncStats();
    const orphanNav: string[] = [];
    for (const profile of Object.values(ROLE_PROFILES)) {
      for (const item of profile.nav) {
        if (item.type === 'link' && !MODULE_REGISTRY[item.moduleId]) {
          orphanNav.push(`${profile.id}:${item.moduleId}`);
        }
      }
    }
    const status =
      orphanNav.length > 0 ? 'error' : stats.roleOverrides > 80 ? 'warn' : 'ok';
    results.push({
      key: 'roles-sidebar',
      label: 'Rôles ↔ Sidebar',
      status,
      detail:
        orphanNav.length > 0
          ? `${orphanNav.length} lien(s) nav vers module absent (${orphanNav.slice(0, 3).join(', ')})`
          : `${stats.modules} modules · ${stats.editableRoles} rôles · ${stats.roleOverrides} override(s) · ${stats.usersWithOverrides} user(s)`,
    });
  } catch {
    results.push({
      key: 'roles-sidebar',
      label: 'Rôles ↔ Sidebar',
      status: 'unknown',
      detail: 'Impossible de vérifier la matrice rôles / modules',
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const url = process.env.DATABASE_URL || '';
    const kind = url.startsWith('postgres')
      ? 'PostgreSQL'
      : url.startsWith('file:') || url.includes('sqlite')
        ? 'SQLite'
        : 'Base connectée';
    results.push({
      key: 'base-api',
      label: 'Base ↔ API',
      status: 'ok',
      healthLevel: 'HEALTHY',
      detail: `${kind} — ping OK`,
    });
  } catch {
    results.push({
      key: 'base-api',
      label: 'Base ↔ API',
      status: 'error',
      healthLevel: 'FAILED',
      detail: 'DB inaccessible — non vérifié',
    });
  }

  // ANO-DIAG — outbox : jamais vert si non mesuré
  try {
    const { getOutboxDiagnostics, displayOutboxLevel } = await import(
      '@/lib/server/outbox-diagnostics'
    );
    const ox = await getOutboxDiagnostics();
    const level = displayOutboxLevel(ox);
    const statusMap = {
      HEALTHY: 'ok' as const,
      DEGRADED: 'warn' as const,
      FAILED: 'error' as const,
      UNKNOWN: 'unknown' as const,
      NOT_CHECKED: 'unknown' as const,
    };
    results.push({
      key: 'outbox',
      label: 'Outbox sync',
      status: statusMap[level],
      healthLevel: level,
      detail: ox.checked
        ? `pending=${ox.pending} processing=${ox.processing} failed=${ox.failed} dead=${ox.dead} worker=${ox.workerStatus}`
        : `NOT_CHECKED — ${ox.notes.join('; ')}`,
    });
  } catch {
    results.push({
      key: 'outbox',
      label: 'Outbox sync',
      status: 'unknown',
      healthLevel: 'NOT_CHECKED',
      detail: 'Mesure outbox non exécutée — ne pas afficher OK',
    });
  }

  // SYN-02 : catch générique → unknown avec détail, jamais ok silencieux
  for (const r of results) {
    if (r.status === 'unknown' && !r.detail) {
      r.detail = 'Vérification impossible — non confirmé';
    }
    if (!r.healthLevel) {
      r.healthLevel =
        r.status === 'ok'
          ? 'HEALTHY'
          : r.status === 'warn'
            ? 'DEGRADED'
            : r.status === 'error'
              ? 'FAILED'
              : 'UNKNOWN';
    }
  }

  return results;
}

/**
 * Bundle unique : une seule analyse drift pour summary + diagnostics + report.
 * Cache 12s pour absorber Overview / Cockpit / Centre sync en parallèle.
 */
export async function getSyncDiagnosticsBundle(opts?: {
  bypassCache?: boolean;
}): Promise<SyncDiagnosticsBundle> {
  const now = Date.now();
  if (!opts?.bypassCache && diagnosticsCache && now - diagnosticsCache.at < DIAGNOSTICS_TTL_MS) {
    return diagnosticsCache.value;
  }

  const driftReport = await runFullSyncDriftAnalysis().catch(() => null);
  const [summary, diagnostics] = await Promise.all([
    getSyncStatusSummary(driftReport),
    runSyncDiagnostics(driftReport),
  ]);

  const value: SyncDiagnosticsBundle = { summary, diagnostics, driftReport };
  diagnosticsCache = { at: now, value };
  return value;
}

/** Invalide le cache après publication / repair sync */
export function invalidateSyncDiagnosticsCache() {
  diagnosticsCache = null;
}
