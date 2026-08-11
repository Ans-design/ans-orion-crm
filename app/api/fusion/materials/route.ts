export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { fusionMaterialPatchSchema } from '@/lib/server/modules/fusion/fusion.validation';
import {
  listMaterialsForAdmin,
  setGrammageActive,
  setMaterialActive,
} from '@/lib/services/fusion-admin-service';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const materials = await listMaterialsForAdmin();
    return NextResponse.json({ materials });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : 'Tables fusion absentes — db:push + import:fusion',
      503,
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('config:edit_chips');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(fusionMaterialPatchSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { type, id, actif } = parsed.data;

    if (type === 'grammage') {
      const updated = await setGrammageActive(id, actif);
      return NextResponse.json({ ok: true, grammage: updated });
    }

    const updated = await setMaterialActive(id, actif);
    return NextResponse.json({ ok: true, material: updated });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erreur mise à jour matière', 500);
  }
}
