export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listDraftPricingArticleIds,
  publishBulkArticleDynamicPricing,
} from '@/lib/pricing/publish-dynamic-pricing';
import { publishBaseMaterialsPricing } from '@/lib/server/modules/pricing/pricing-publication.service';
import {
  buildCertifiedPricingSnapshot,
  publishPricingRelease,
} from '@/lib/pricing/pricing-release-service';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';
import { invalidateSyncDiagnosticsCache } from '@/lib/services/sync.service';
import { propagatePricingToCommercialNow } from '@/lib/services/commercial-live-propagation.service';
import { jsonWithLiveDomains } from '@/lib/live/live-response';

type BulkPublishBody = {
  articleIds?: string[];
  mode?: 'selected' | 'all_draft';
};

export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as BulkPublishBody;
    let articleIds = Array.isArray(body.articleIds) ? body.articleIds.filter(Boolean) : [];

    if (body.mode === 'all_draft' || articleIds.length === 0) {
      articleIds = await listDraftPricingArticleIds(200);
    }

    if (articleIds.length === 0) {
      return jsonWithLiveDomains(
        {
          ok: true,
          data: { published: [], failed: [], message: 'Aucun article brouillon à publier' },
        },
        ['pricing', 'catalogue', 'sync'],
      );
    }

    const result = await publishBulkArticleDynamicPricing(articleIds, auth.userId);
    const basePub = await publishBaseMaterialsPricing(auth.userId);

    let pricingRelease: { releaseId: string; version: number; hash: string } | null = null;
    if (result.published.length > 0) {
      invalidateKpiCaches();
      const snapshot = await buildCertifiedPricingSnapshot();
      pricingRelease = await publishPricingRelease({
        snapshot,
        createdBy: auth.userId,
        approvedBy: auth.userId,
      });
      invalidateSyncDiagnosticsCache();
    }

    // Immédiat (sans attendre cron outbox) : index prix POS + caches
    const propagation = await propagatePricingToCommercialNow({ rebuildIndex: true });

    return jsonWithLiveDomains(
      {
        ok: true,
        data: {
          ...result,
          requested: articleIds.length,
          pricingRelease,
          message:
            result.failed.length === 0
              ? `${result.published.length} article(s) publié(s) · matières ${basePub.materialsPublished} · prix base ${basePub.basePrintingPublished}${
                  pricingRelease ? ` · release v${pricingRelease.version}` : ''
                } · POS à jour`
              : `${result.published.length} publié(s), ${result.failed.length} échec(s)`,
          baseMaterialsPublished: basePub.materialsPublished,
          basePrintingPublished: basePub.basePrintingPublished,
          commercialPropagated: true,
        },
      },
      propagation.domains,
    );
  } catch (error) {
    console.error('[admin-backoffice/pricing/publish-bulk]', error);
    return NextResponse.json(
      {
        ok: false,
        error: { message: safeErrorMessage(error, 'Publication groupée impossible'), code: 'BULK_PUBLISH_ERROR' },
      },
      { status: 500 },
    );
  }
}
