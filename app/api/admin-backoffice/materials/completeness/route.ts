export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { buildMaterialsCompletenessMatrix } from '@/lib/server/modules/materials/materials-completeness.service';

export async function GET() {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const data = await buildMaterialsCompletenessMatrix();
  return NextResponse.json({ ok: true, data });
}
