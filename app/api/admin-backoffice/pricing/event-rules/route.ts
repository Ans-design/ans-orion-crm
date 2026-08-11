export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  ensureEventPricingSeeded,
  ensureEventPricingRuntimeReady,
  invalidateEventPricingRuntime,
  pricingRulesSyncService,
  verifyPricingConsistency,
} from '@/lib/services/event-pricing-sync.service';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PROMO_RULES } from '@/lib/pricing/event-pricing';
import { DEFAULT_MATERIAL_FORMAT_LIMITS } from '@/lib/pricing/material-format-limits';
import { DEFAULT_EVENT_ACCESSORIES } from '@/lib/pricing/event-accessories';

const PROMO_COLUMNS = [
  'ID', 'ARTICLE', 'MATIÈRE', 'FAMILLE', 'FORMAT MIN', 'FORMAT MAX',
  'TYPE REMISE', 'VALEUR REMISE', 'SOURCE PRIX', 'ACTIF', 'DÉTAIL',
] as const;

const LIMIT_COLUMNS = [
  'ID', 'MATIÈRE', 'FORMAT MAX', 'LARGEUR MAX MM', 'HAUTEUR MAX MM',
  'UNITÉ', 'MESSAGE POS', 'ACTIF', 'DÉTAIL',
] as const;

function hasDelegate(name: string): boolean {
  const client = prisma as unknown as Record<string, unknown>;
  return typeof client[name] === 'object' && client[name] != null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const kind = new URL(req.url).searchParams.get('kind') || 'promo';
  try {
    await ensureEventPricingSeeded();
    await ensureEventPricingRuntimeReady();

    if (kind === 'verify') {
      const report = await verifyPricingConsistency();
      return NextResponse.json({ ok: true, data: report });
    }

    if (kind === 'limits') {
      const rows = hasDelegate('materialFormatLimit')
        ? await (prisma as any).materialFormatLimit.findMany({ orderBy: { sortOrder: 'asc' } })
        : DEFAULT_MATERIAL_FORMAT_LIMITS;
      return NextResponse.json({ ok: true, data: { rows, columns: LIMIT_COLUMNS } });
    }

    if (kind === 'accessories') {
      const rows = hasDelegate('eventAccessoryPrice')
        ? await (prisma as any).eventAccessoryPrice.findMany({ orderBy: { sortOrder: 'asc' } })
        : DEFAULT_EVENT_ACCESSORIES;
      return NextResponse.json({ ok: true, data: { rows } });
    }

    const rows = hasDelegate('articlePromotionalRule')
      ? await (prisma as any).articlePromotionalRule.findMany({ orderBy: { sortOrder: 'asc' } })
      : DEFAULT_PROMO_RULES;
    return NextResponse.json({ ok: true, data: { rows, columns: PROMO_COLUMNS } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_price', 'config:publish');
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'sync');

    if (action === 'verify') {
      return NextResponse.json({ ok: true, data: await verifyPricingConsistency() });
    }

    if (action === 'sync') {
      const result = await pricingRulesSyncService.recalculatePosPrices();
      return NextResponse.json({ ok: true, data: result });
    }

    if (action === 'invalidate') {
      invalidateEventPricingRuntime();
      await ensureEventPricingRuntimeReady();
      return NextResponse.json({ ok: true, data: { invalidated: true } });
    }

    return NextResponse.json({ ok: false, error: 'action inconnue' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
