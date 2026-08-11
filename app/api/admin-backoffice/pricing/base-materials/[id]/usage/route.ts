export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { getMaterialUsage } from '@/lib/server/modules/materials/materials-completeness.service';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const data = await getMaterialUsage(params.id);
  return NextResponse.json({ ok: true, data });
}
