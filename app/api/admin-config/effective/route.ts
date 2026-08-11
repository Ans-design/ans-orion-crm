export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getEffectivePosConfig, getDraftEffectivePosConfig } from '@/lib/services/admin-config';
import { runApiHandler } from '@/lib/api-guard';

const PREVIEW_ROLES = new Set(['admin', 'manager']);

/** Config effective — publiée par défaut ; ?preview=draft&role=commercial pour admin */
export async function GET(req: NextRequest) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  const preview = req.nextUrl.searchParams.get('preview');
  const previewRole = req.nextUrl.searchParams.get('role') ?? auth.role;

  if (preview === 'draft') {
    const draftAuth = await requirePermission('config:view');
    if ('error' in draftAuth) return draftAuth.error;
    if (!PREVIEW_ROLES.has(draftAuth.role)) {
      return NextResponse.json({ error: 'Preview brouillon réservée aux admins' }, { status: 403 });
    }
    return runApiHandler('admin-config/effective draft GET', async () => {
      return NextResponse.json(await getDraftEffectivePosConfig(previewRole));
    }, { fallbackResponse: {} });
  }

  return runApiHandler('admin-config/effective GET', async () => {
    return NextResponse.json(await getEffectivePosConfig(auth.role));
  }, { fallbackResponse: {} });
}
