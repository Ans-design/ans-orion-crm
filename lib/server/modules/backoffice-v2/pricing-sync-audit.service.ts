import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { prisma } from '@/lib/prisma';
import { scanPricingAnomalies, countAnomaliesBySeverity } from '@/lib/pricing/pricing-anomalies';
import { getPricingArticleDiffPos, listPricingArticles } from './admin-backoffice-pricing.service';
import { runFullSyncDriftAnalysis } from '@/lib/services/sync-drift-service';

export type PricingSyncAuditIssue = {
  id: string;
  category: 'anomaly' | 'sync' | 'publish' | 'pos_drift' | 'chips' | 'tiers';
  severity: 'critical' | 'warning' | 'info';
  articleId: string | null;
  title: string;
  message: string;
  recommendedAction: string;
};

export type PricingSyncAuditReport = {
  checkedAt: string;
  summary: {
    totalArticles: number;
    publishedProfiles: number;
    draftProfiles: number;
    anomalyCounts: { critical: number; warning: number; info: number };
    syncDriftScore: number;
    posDriftArticles: number;
    unpublishedChips: number;
    unpublishedTierArticles: number;
    totalIssues: number;
  };
  issues: PricingSyncAuditIssue[];
  syncDrift: Awaited<ReturnType<typeof runFullSyncDriftAnalysis>>;
  samples: {
    posDrift: { articleId: string; diffs: number }[];
    failedPublishCandidates: string[];
  };
};

export async function runPricingSyncAudit(options: {
  posDriftSampleSize?: number;
  anomalyLimit?: number;
} = {}): Promise<PricingSyncAuditReport> {
  const posDriftSampleSize = options.posDriftSampleSize ?? 25;
  const anomalyLimit = options.anomalyLimit ?? 500;
  const issues: PricingSyncAuditIssue[] = [];

  const [
    anomalies,
    syncDrift,
    articlesPayload,
    publishedCount,
    draftCount,
  ] = await Promise.all([
    scanPricingAnomalies(anomalyLimit),
    runFullSyncDriftAnalysis(),
    listPricingArticles({ includeInactive: true }),
    prisma.articlePricingProfile.count({ where: { status: 'published' } }),
    prisma.articlePricingProfile.count({ where: { status: { not: 'published' } } }),
  ]);

  const articlesWithPosDrift = articlesPayload.articles.filter((a) => a.anomalyCount > 0 || a.publicationStatus === 'draft');

  const anomalyCounts = countAnomaliesBySeverity(anomalies);
  for (const a of anomalies) {
    issues.push({
      id: a.id,
      category: 'anomaly',
      severity: a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info',
      articleId: a.articleId,
      title: a.message.slice(0, 80),
      message: a.message,
      recommendedAction: a.recommendedAction,
    });
  }

  for (const alert of syncDrift.alerts) {
    issues.push({
      id: `sync-${alert.id}`,
      category: 'sync',
      severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'warn' ? 'warning' : 'info',
      articleId: null,
      title: alert.title,
      message: alert.message,
      recommendedAction: `Voir ${alert.href}`,
    });
  }

  const draftArticlesList = articlesPayload.articles.filter((a) => a.publicationStatus === 'draft');
  for (const art of draftArticlesList.slice(0, 40)) {
    issues.push({
      id: `draft-profile-${art.articleId}`,
      category: 'publish',
      severity: 'info',
      articleId: art.articleId,
      title: `${art.articleLabel} — profil brouillon`,
      message: 'Le POS utilise les tarifs legacy ou une version antérieure pour cet article.',
      recommendedAction: 'Publier depuis Prix & Calculs ou publication groupée',
    });
  }

  const posDriftCandidates = articlesWithPosDrift.slice(0, posDriftSampleSize);

  const posDriftSamples: { articleId: string; diffs: number }[] = [];
  for (const art of posDriftCandidates) {
    try {
      const diff = await getPricingArticleDiffPos(art.articleId);
      const diffs = diff.filter((d) => d.differs).length;
      if (diffs > 0) {
        posDriftSamples.push({ articleId: art.articleId, diffs });
        issues.push({
          id: `pos-drift-${art.articleId}`,
          category: 'pos_drift',
          severity: diffs >= 3 ? 'warning' : 'info',
          articleId: art.articleId,
          title: `${art.articleLabel} — ${diffs} écart(s) brouillon vs publié`,
          message: 'Variables, paliers ou formule différents entre backoffice brouillon et POS publié.',
          recommendedAction: 'Comparer dans Prix & Calculs → Diff POS puis publier',
        });
      }
    } catch {
      /* skip single article */
    }
  }

  const configPublishPending = syncDrift.pricing?.draft ?? draftCount;
  if (configPublishPending > 0) {
    issues.push({
      id: 'profiles-unpublished',
      category: 'publish',
      severity: configPublishPending >= 10 ? 'warning' : 'info',
      articleId: null,
      title: `${configPublishPending} profil(s) tarifaires non publiés`,
      message: 'Le POS peut utiliser des tarifs legacy ou une version antérieure pour ces articles.',
      recommendedAction: 'Publication groupée depuis Prix & Calculs ou sync backoffice',
    });
  }

  const withoutFormula = articlesPayload.articles.filter((a) => a.formulaStatus === 'none');
  for (const art of withoutFormula.slice(0, 20)) {
    if (issues.some((i) => i.id === `no-formula-${art.articleId}`)) continue;
    issues.push({
      id: `audit-no-formula-${art.articleId}`,
      category: 'anomaly',
      severity: 'critical',
      articleId: art.articleId,
      title: `${art.articleLabel} sans formule`,
      message: 'Article catalogue sans formule dynamique active.',
      recommendedAction: 'Sync catalogue ou migration PRIX 2026',
    });
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    checkedAt: new Date().toISOString(),
    summary: {
      totalArticles: POS_CATALOGUE.length,
      publishedProfiles: publishedCount,
      draftProfiles: draftCount,
      anomalyCounts,
      syncDriftScore: syncDrift.totalScore,
      posDriftArticles: posDriftSamples.length,
      unpublishedChips: 0,
      unpublishedTierArticles: draftCount,
      totalIssues: issues.length,
    },
    issues,
    syncDrift,
    samples: {
      posDrift: posDriftSamples.sort((a, b) => b.diffs - a.diffs).slice(0, 12),
      failedPublishCandidates: draftArticlesList
        .filter((a) => a.formulaStatus === 'none')
        .map((a) => a.articleId)
        .slice(0, 12),
    },
  };
}
