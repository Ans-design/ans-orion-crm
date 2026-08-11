import { scanPricingAnomalies, countAnomaliesBySeverity } from '@/lib/pricing/pricing-anomalies';
import type { BackofficeAnomalyList } from './backoffice.types';

export async function listBackofficeAnomalies(limit = 500): Promise<BackofficeAnomalyList> {
  const items = await scanPricingAnomalies(limit);
  const counts = countAnomaliesBySeverity(items);
  return {
    items,
    critical: counts.critical,
    warning: counts.warning,
    info: counts.info,
    checkedAt: new Date().toISOString(),
  };
}

export async function listArticleAnomalies(articleId: string, limit = 500) {
  const all = await scanPricingAnomalies(limit);
  return all.filter((a) => a.articleId === articleId || a.articleId === null);
}
