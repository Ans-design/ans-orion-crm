import type { AdminNavBadgeCounts } from '@/lib/administration/admin-macro-modules';
import type { AdminBackofficeOverview } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';

/** Mappe l'overview backoffice vers les badges macro sidebar Administration. */
export function mapOverviewToNavBadges(overview: AdminBackofficeOverview): AdminNavBadgeCounts {
  const stockUnlinked = Math.max(0, overview.materialsTotal - overview.materialsLinkedStock);
  return {
    'catalogue-incomplete': overview.withoutFormula,
    'pricing-missing': overview.materialsMissingPrice,
    'stock-unlinked': stockUnlinked,
    'anomalies-critical': overview.anomaliesCritical,
    unpublished: overview.unpublishedChanges + overview.drafts,
  };
}
