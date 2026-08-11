export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { carriersConfigSchema } from '@/lib/logistics/carriers-config';
import {
  getCarriersConfig,
  getCarriersConfigAdmin,
  saveCarriersConfig,
} from '@/lib/services/carriers-config-service';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('livraisons:read', 'config:view');
  if ('error' in auth) return auth.error;

  const adminView = new URL(req.url).searchParams.get('admin') === '1';
  if (adminView) {
    const adminAuth = await requirePermission('config:view');
    if ('error' in adminAuth) return adminAuth.error;
    const carriers = await getCarriersConfigAdmin();
    return NextResponse.json({ carriers, source: 'systemConfig' });
  }

  const carriers = await getCarriersConfig();
  return NextResponse.json({ carriers, source: 'systemConfig' });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('config:edit_chips');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(carriersConfigSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const saved = await saveCarriersConfig(parsed.data, auth.userId);
    return NextResponse.json({ carriers: saved });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur sauvegarde transporteurs'), 500);
  }
}
