export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { materialsConfigSchema } from '@/lib/validators/phase3';
import { getMaterialsConfig, saveMaterialsConfig } from '@/lib/services/materials-config-service';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const materials = await getMaterialsConfig();
  return NextResponse.json(materials);
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('config:edit_chips');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(materialsConfigSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const saved = await saveMaterialsConfig(parsed.data, auth.userId);
    return NextResponse.json(saved);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur sauvegarde matières'), 500);
  }
}
