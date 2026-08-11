import { scanPricingAnomalies } from '@/lib/pricing/pricing-anomalies';
import { auditMaterialsUsedInPos } from './materials-used-pos.audit';
import { listBaseMaterialsWithAnomalies } from './base-material.service';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';

export type PricingAnomalyRow = {
  level: 'critical' | 'warning' | 'info';
  articleId: string | null;
  element: string;
  problem: string;
  impact: string;
  recommendedAction: string;
  status: 'open';
};

export async function scanExtendedPricingAnomalies(): Promise<PricingAnomalyRow[]> {
  const rows: PricingAnomalyRow[] = [];

  const [baseResult, materialsAudit, core] = await Promise.all([
    listBaseMaterialsWithAnomalies(),
    auditMaterialsUsedInPos(),
    scanPricingAnomalies(200),
  ]);

  const base = baseResult.rows;

  if (!isPrix2026LegacyEnabled()) {
    rows.push({
      level: 'info',
      articleId: null,
      element: 'PRIX 2026',
      problem: 'PRIX 2026 désactivé pour le calcul (legacy archive)',
      impact: 'POS',
      recommendedAction: 'Utiliser Matières DB + profils publiés',
      status: 'open',
    });
  }

  for (const m of base) {
    for (const a of m.anomalies) {
      rows.push({
        level: a.includes('inférieur') ? 'critical' : 'warning',
        articleId: null,
        element: m.label,
        problem: a,
        impact: 'POS/CRM',
        recommendedAction: 'Compléter Matières de base puis publier',
        status: 'open',
      });
    }
  }

  for (const m of materialsAudit.materials.filter((x) => x.anomalies.length)) {
    rows.push({
      level: 'warning',
      articleId: m.linkedArticles[0] ?? null,
      element: m.label,
      problem: m.anomalies.join(' ; '),
      impact: 'POS',
      recommendedAction: 'Ajouter dans Matières de base',
      status: 'open',
    });
  }

  for (const a of core) {
    rows.push({
      level: a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info',
      articleId: a.articleId,
      element: a.source,
      problem: a.message,
      impact: 'POS/CRM',
      recommendedAction: a.recommendedAction,
      status: 'open',
    });
  }

  return rows;
}
