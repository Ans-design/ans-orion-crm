export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { handlePricingTablePatch, handlePricingTableDelete, pricingTableError } from '@/lib/server/modules/direct-sale/pricing-table-handlers';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    return handlePricingTablePatch('design', id, body, {
      userId: auth.userId,
      userName: auth.userName,
    });
  } catch (e) {
    return pricingTableError(e, 'MAJ impossible');
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  return handlePricingTableDelete('design', id, {
    userId: auth.userId,
    userName: auth.userName,
  });
}
