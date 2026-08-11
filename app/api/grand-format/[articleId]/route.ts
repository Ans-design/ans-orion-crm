export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import {
  loadGrandFormatStockProfile,
} from '@/lib/grand-format/stock-profile';
import { getGfArticleMeta } from '@/lib/grand-format/article-meta';
import {
  mergeGfLaizeChipsWithFallback,
  laizeChipLabelsFromMerged,
} from '@/lib/grand-format/pos-config';
import { loadGfAdminPricingToRuntime } from '@/lib/services/gf-admin-pricing.service';
import { getGfAdminPricing } from '@/lib/grand-format/gf-admin-config';
import { runApiHandler } from '@/lib/api-guard';

type RouteCtx = { params: Promise<{ articleId: string }> };

/** Profil stock + laizes + prix A0 pour configurateur Grand Format */
export async function GET(_req: Request, ctx: RouteCtx) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) {
    const cfg = await requirePermission('config:view');
    if ('error' in cfg) return auth.error;
  }

  return runApiHandler('grand-format GET', async () => {
    const { articleId } = await ctx.params;
  const meta = getGfArticleMeta(articleId);
  if (!meta) {
    return NextResponse.json({ error: 'Article grand format inconnu' }, { status: 404 });
  }

  const profile = await loadGrandFormatStockProfile(articleId);
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  const stockLaizes = profile.laizes.map((l) => ({
    label: l.label,
    cm: l.cm,
    available: l.available,
    quantity: l.quantity,
    rupture: !l.available,
  }));

  const laizeChips = mergeGfLaizeChipsWithFallback(articleId, stockLaizes);
  const adminPricing = await loadGfAdminPricingToRuntime();

  return NextResponse.json({
    articleId,
    stockKind: profile.stockKind,
    laizes: laizeChips,
    plates: profile.plates,
    prixA0: profile.prixA0,
    prixM2: profile.prixM2Fallback,
    laizeChipLabels: laizeChipLabelsFromMerged(laizeChips),
    source: profile.laizes.length ? 'stock+fallback' : 'fallback',
    adminPricing: adminPricing ?? getGfAdminPricing(),
  });
  });
}
