export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { logAudit } from '@/lib/audit';
import { patchChipById } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.service';
import { patchChipGroupSchema } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.validation';

type RouteParams = { params: Promise<{ chipId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('config:edit_chips');
  if ('error' in auth) return auth.error;

  const { chipId: groupId } = await params;
  try {
    const parsed = parseBody(patchChipGroupSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: { message: parsed.error, code: 'VALIDATION' } },
        { status: 400 },
      );
    }

    const result = await patchChipById(groupId, parsed.data);
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'ProductOptionGroup',
      entityId: groupId,
      entityLabel: 'Variable / chip',
      newValue: parsed.data,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Mise à jour impossible'), code: 'PATCH_ERROR' } },
      { status: 400 },
    );
  }
}
