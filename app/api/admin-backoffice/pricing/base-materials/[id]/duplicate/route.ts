export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { duplicateBaseMaterial } from '@/lib/server/modules/pricing/base-material.repository';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const row = await duplicateBaseMaterial(params.id, body);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Duplication impossible') },
      { status: 500 },
    );
  }
}
