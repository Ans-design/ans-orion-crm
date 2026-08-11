export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { posAuditSchema } from '@/lib/server/modules/pos/pos-audit.validation';
import { logPosAudit } from '@/lib/pos-audit';

/** Journalise une action POS côté client (panier vidé, remise, etc.) */
export async function POST(req: NextRequest) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(posAuditSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const { action, entity, entityLabel, details } = parsed.data;
    await logPosAudit({
      userId: auth.userId,
      userName: auth.userName,
      action,
      entity: entity || 'Action',
      entityLabel: entityLabel || action,
      details,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return apiError('Erreur audit POS', 500);
  }
}
