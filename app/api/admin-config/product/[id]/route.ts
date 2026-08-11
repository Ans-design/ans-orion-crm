export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getEffectiveProductConfig, getPublishedConfig } from '@/lib/services/admin-config';
import { runApiHandler } from '@/lib/api-guard';

/** Config effective publiée pour un produit POS (chips, variables, flags). */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin-config/product GET', async () => {
    const published = await getPublishedConfig();
    const effective = getEffectiveProductConfig(ctx.params.id, auth.role, published);
    return NextResponse.json(effective);
  }, { fallbackResponse: {} });
}
