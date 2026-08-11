export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { computeCatalogDrift, reconcileCatalogDraft } from '@/lib/admin-config/catalog-drift';
import { getDraftConfig, saveDraftConfig } from '@/lib/services/admin-config';

export async function POST() {
  const auth = await requirePermission('config:edit_chips');
  if ('error' in auth) return auth.error;

  try {
    const draft = await getDraftConfig();
    const before = computeCatalogDrift(draft);
    const merged = reconcileCatalogDraft(draft);
    const saved = await saveDraftConfig(merged, auth.userId, auth.userName);
    const after = computeCatalogDrift(saved);
    return NextResponse.json({
      ok: true,
      addedChips: before.missingChipIds.length,
      addedArticles: before.missingArticleIds.length,
      labelFixes: before.labelMismatches.length,
      driftBefore: before.totalDrift,
      driftAfter: after.totalDrift,
      details: before.details,
    });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Erreur synchronisation catalogue', 500);
  }
}
