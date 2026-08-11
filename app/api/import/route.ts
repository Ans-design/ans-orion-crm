export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { apiError } from '@/lib/api-response';
import { importPreviewInputSchema } from '@/lib/server/modules/import/import.validation';
import { runImport } from '@/lib/server/modules/import/import.service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('import:run');
  if ('error' in auth) return auth.error;

  return runApiHandler('import POST', async () => {
    const parsed = parseBody(importPreviewInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await runImport(parsed.data, { userId: auth.userId, userName: auth.userName });
    if (!result.ok) {
      return NextResponse.json({ error: result.message, preview: result.preview }, { status: 400 });
    }

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'CREATE',
      entity: 'Import',
      entityLabel: parsed.data.type,
      details: { imported: result.imported, mode: parsed.data.mode },
    });

    return NextResponse.json({ success: true, imported: result.imported });
  });
}
