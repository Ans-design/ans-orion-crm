export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import {
  compareArticlePricingMigration,
  compareMigrationPilotBatch,
  MIGRATION_PILOT_ARTICLES,
} from '@/lib/pricing/compare-pricing-migration';
import { migrateMigrationPilotBatch } from '@/lib/pricing/migrate-from-sale-price2026';
import { parseBody } from '@/lib/validators/common';
import { apiError } from '@/lib/api-response';
import { dynamicPricingComparePostSchema } from '@/lib/server/modules/pricing/dynamic-pricing-api.validation';

export async function GET() {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  return NextResponse.json({ pilotArticles: MIGRATION_PILOT_ARTICLES });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('dynamic-pricing/compare POST', async () => {
    const parsed = parseBody(dynamicPricingComparePostSchema, await req.json().catch(() => ({})));
    if (!parsed.ok) return apiError(parsed.error, 400);
    const body = parsed.data;
    const qty = body.qty ?? 100;
    const config = body.config ?? { qty };

    if (body.action === 'pilot') {
      const rows = await compareMigrationPilotBatch(qty);
      const readyCount = rows.filter((r) => r.migrationReady).length;
      return NextResponse.json({ rows, qty, readyCount, total: rows.length });
    }

    if (body.action === 'migrate-pilots') {
      const dryRun = Boolean(body.dryRun);
      const results = await migrateMigrationPilotBatch(dryRun);
      const rows = await compareMigrationPilotBatch();
      return NextResponse.json({
        results,
        rows,
        migrated: results.filter((r) => !r.skipped).length,
        dryRun,
      });
    }

    const articleId = body.articleId ?? '';
    if (!articleId) {
      return apiError('articleId requis', 400);
    }

    const row = await compareArticlePricingMigration(articleId, config, qty);
    return NextResponse.json(row);
  }, { fallback: { error: 'compare indisponible' } });
}
