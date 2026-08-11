export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  detectPricingDrift,
  migratePricingSourcesToCanonical,
  mergeDuplicateMaterialsAndResync,
  rebuildPOSPriceIndex,
  verifyNoDuplicatePriceSources,
  pricingDataSyncService,
} from '@/lib/services/pricing-data-sync.service';
import { listMaterialContextPrices } from '@/lib/pricing/material-context-price';
import { pricingResolver } from '@/lib/pricing/pricing-resolver';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const kind = new URL(req.url).searchParams.get('kind') || 'overview';
  try {
    if (kind === 'drifts' || kind === 'anomalies') {
      const drifts = await detectPricingDrift();
      return NextResponse.json({
        ok: true,
        data: {
          drifts,
          counts: {
            total: drifts.length,
            errors: drifts.filter((d) => d.severity === 'error').length,
            warns: drifts.filter((d) => d.severity === 'warn').length,
            duplicates: drifts.filter((d) => d.kind === 'duplicate_material').length,
            divergences: drifts.filter((d) => d.kind === 'price_divergence').length,
          },
        },
      });
    }

    if (kind === 'context-prices') {
      const context = new URL(req.url).searchParams.get('context') || undefined;
      const rows = await listMaterialContextPrices({ priceContext: context });
      return NextResponse.json({ ok: true, data: { rows } });
    }

    if (kind === 'verify') {
      return NextResponse.json({ ok: true, data: await verifyNoDuplicatePriceSources() });
    }

    // overview
    const [drifts, ctxSmall, ctxGf] = await Promise.all([
      detectPricingDrift(),
      listMaterialContextPrices({ priceContext: 'PRINT_SMALL_FORMAT' }),
      listMaterialContextPrices({ priceContext: 'PRINT_GRAND_FORMAT' }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        architecture: {
          sourceOfTruth: 'BaseMaterial + MaterialContextPrice',
          rules: 'PricingRule / équivalences / promo / paliers',
          views: ['Impression SF', 'Grand Format', 'Articles vente directe'],
          pos: 'pricingResolver → calculatePrice',
        },
        stats: {
          contextSmallFormat: ctxSmall.length,
          contextGrandFormat: ctxGf.length,
          drifts: drifts.length,
          driftErrors: drifts.filter((d) => d.severity === 'error').length,
        },
        tabs: [
          { id: 'matieres', label: 'Matières & Stock', href: '/administration/matieres' },
          { id: 'isf', label: 'Prix impression petit format', href: '/administration/impression-sf' },
          { id: 'gf', label: 'Prix impression grand format', href: '/administration/grand-format-prix' },
          { id: 'avd', label: 'Articles vente directe', href: '/administration/articles-vente-directe' },
          { id: 'finitions', label: 'Finitions & Façonnage', href: '/administration/finitions-reliures' },
          { id: 'packaging', label: 'Packaging — Boîte', href: '/administration/packaging' },
          { id: 'packaging-sac', label: 'Packaging — Sac papier', href: '/administration/packaging-sac' },
          { id: 'packaging-soft', label: 'Packaging soft (Doypack…)', href: '/administration/packaging-soft' },
          { id: 'regles', label: 'Règles & Formules', href: '/administration/equivalences-matieres' },
          { id: 'paliers', label: 'Paliers & Remises', href: '/administration/paliers-vente-directe' },
          { id: 'sync', label: 'Synchronisation POS', href: '/administration/synchronisation' },
          { id: 'anomalies', label: 'Anomalies prix', href: '/administration/base-prix-matieres?tab=anomalies' },
        ],
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_price', 'config:publish');
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'migrate');
    const userId = 'userId' in auth ? auth.userId : undefined;
    const userName = 'userName' in auth ? (auth as { userName?: string }).userName : undefined;

    if (action === 'migrate') {
      const report = await migratePricingSourcesToCanonical({ userId, userName });
      return NextResponse.json({ ok: true, data: report });
    }

    if (action === 'rebuild') {
      const data = await rebuildPOSPriceIndex();
      return NextResponse.json({ ok: true, data });
    }

    if (action === 'merge-duplicates') {
      const data = await mergeDuplicateMaterialsAndResync({
        userId,
        userName,
        dryRun: body.dryRun === true,
      });
      return NextResponse.json({ ok: true, data });
    }

    if (action === 'detect') {
      return NextResponse.json({ ok: true, data: { drifts: await detectPricingDrift() } });
    }

    if (action === 'resolve-preview') {
      const materialKey = String(body.materialKey || '');
      const context = String(body.context || 'PRINT_SMALL_FORMAT');
      const price = await pricingResolver.getMaterialBasePrice(materialKey, context);
      return NextResponse.json({ ok: true, data: { price } });
    }

    if (action === 'update-context-price') {
      const id = String(body.id || '');
      if (!id) {
        return NextResponse.json({ ok: false, error: 'id requis' }, { status: 400 });
      }
      const priceHT = body.priceHT != null ? Number(body.priceHT) : undefined;
      const costHT = body.costHT !== undefined
        ? (body.costHT == null || body.costHT === '' ? null : Number(body.costHT))
        : undefined;
      if (priceHT != null && (!(priceHT >= 0) || Number.isNaN(priceHT))) {
        return NextResponse.json({ ok: false, error: 'priceHT invalide' }, { status: 400 });
      }
      const data: Record<string, unknown> = {};
      if (priceHT != null) data.priceHT = priceHT;
      if (costHT !== undefined) data.costHT = costHT;
      if (Object.keys(data).length === 0) {
        return NextResponse.json({ ok: false, error: 'Aucun champ à mettre à jour' }, { status: 400 });
      }
      const updated = await (prisma as any).materialContextPrice.update({
        where: { id },
        data,
      });
      return NextResponse.json({ ok: true, data: { row: updated } });
    }

    if (action === 'sync-small') {
      return NextResponse.json({ ok: true, data: await pricingDataSyncService.syncMaterialToSmallFormat() });
    }

    if (action === 'sync-gf') {
      return NextResponse.json({ ok: true, data: await pricingDataSyncService.syncMaterialToGrandFormat() });
    }

    return NextResponse.json({ ok: false, error: 'action inconnue' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
