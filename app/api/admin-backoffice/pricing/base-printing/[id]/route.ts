export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { patchBasePrintingPrice } from '@/lib/server/modules/pricing/base-printing-price.service';

const ALLOWED = new Set([
  'materialKey', 'grammage', 'formatLabel', 'face', 'saleUnit', 'referenceQty',
  'basePrice', 'maxSafetyPrice', 'materialCost', 'printCost', 'marginPct',
  'active', 'publicationStatus', 'colorMode', 'printTechnology', 'keepPublished',
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) data[k] = v;
    }
    const row = await patchBasePrintingPrice(params.id, data);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Mise à jour impossible') },
      { status: 500 },
    );
  }
}
