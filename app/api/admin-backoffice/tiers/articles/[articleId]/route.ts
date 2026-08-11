export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import { logAudit } from '@/lib/audit';
import {
  getArticleTiers,
  publishArticleTiers,
  saveArticleTiers,
} from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.service';
import { attachLiveDomains } from '@/lib/live/live-response';
import { z } from 'zod';

const saveTiersSchema = z.object({
  tierMode: z.enum(['unit_price', 'percent', 'fixed_discount', 'coefficient', 'total_band', 'formula']).optional(),
  qtyMin: z.number().positive().min(0.01).nullable().optional(),
  saleUnit: z.string().trim().max(40).optional(),
  publishToPos: z.boolean().optional(),
  variantKey: z.string().max(120).optional(),
  variantLabel: z.string().max(200).nullable().optional(),
  tiers: z.array(z.object({
    id: z.string().optional(),
    minQty: z.number().positive().min(0.01),
    maxQty: z.number().positive().min(0.01).nullable(),
    unitPrice: z.number().nullable().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    active: z.boolean().optional(),
  })),
});

type RouteParams = { params: Promise<{ articleId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  const { articleId } = await resolveParams(params);

  return runApiHandler(`admin-backoffice/tiers/articles/${articleId} GET`, async () => {
    const data = await getArticleTiers(articleId);
    if (!data) return NextResponse.json({ ok: false, error: 'Article introuvable' }, { status: 404 });
    return attachLiveDomains(NextResponse.json({ ok: true, data }), ['pricing', 'catalogue']);
  }, { fallbackResponse: { ok: false, error: 'Paliers indisponibles' } });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  const { articleId } = await resolveParams(params);

  try {
    const parsed = parseBody(saveTiersSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: { message: parsed.error } }, { status: 400 });
    }
    const data = await saveArticleTiers(articleId, {
      ...parsed.data,
      tiers: parsed.data.tiers.map((t) => ({
        ...t,
        unitPrice: t.unitPrice ?? null,
        discountPercent: t.discountPercent ?? 0,
      })),
    }, auth.userId);
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: parsed.data.publishToPos ? 'PUBLISH' : 'UPDATE',
      entity: 'DiscountTier',
      entityId: articleId,
      entityLabel: `Paliers — ${articleId}`,
      details: { count: parsed.data.tiers.length, publishToPos: Boolean(parsed.data.publishToPos) },
    });
    const res = NextResponse.json({ ok: true, data });
    return attachLiveDomains(res, ['pricing', 'catalogue', 'sync']);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Sauvegarde impossible') } },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  const { articleId } = await resolveParams(params);
  const body = await req.json().catch(() => ({}));
  if (body.action !== 'publish') {
    return NextResponse.json({ ok: false, error: 'Action non supportée' }, { status: 400 });
  }
  try {
    const result = await publishArticleTiers(articleId, auth.userId);
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'PUBLISH',
      entity: 'DiscountTier',
      entityId: articleId,
      entityLabel: `Publication paliers — ${articleId}`,
      details: result,
    });
    const data = await getArticleTiers(articleId);
    const res = NextResponse.json({ ok: true, data, result });
    return attachLiveDomains(res, ['pricing', 'catalogue', 'sync']);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Publication impossible') } },
      { status: 400 },
    );
  }
}
