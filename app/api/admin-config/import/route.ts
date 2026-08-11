export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { logAudit } from '@/lib/audit';
import { parseBody } from '@/lib/validators/common';
import type { AdminConfigSnapshot } from '@/lib/admin-config/types';
import { adminConfigImportSchema } from '@/lib/validators/admin-config';
import { saveDraftConfig } from '@/lib/services/admin-config';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:import');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(adminConfigImportSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const snapshot = parsed.data.draft ?? parsed.data.published;
    if (!snapshot) return apiError('JSON invalide — articles et chips requis', 400);

    const saved = await saveDraftConfig(
      { ...(snapshot as AdminConfigSnapshot), status: 'draft' },
      auth.userId,
      auth.userName,
    );
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'IMPORT',
      entity: 'AdminConfig',
      entityLabel: 'Import configuration brouillon',
    });
    return NextResponse.json(saved);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Erreur import', 500);
  }
}
