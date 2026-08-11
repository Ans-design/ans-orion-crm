export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { parseBody } from '@/lib/validators/common';
import { apiError } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { importPreviewInputSchema } from '@/lib/server/modules/import/import.validation';
import { previewImport } from '@/lib/server/modules/import/import.service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('import:run');
  if ('error' in auth) return auth.error;

  return runApiHandler('import preview POST', async (): Promise<Response> => {
    const parsed = parseBody(importPreviewInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const preview = previewImport(parsed.data);
    return NextResponse.json({ ok: true, data: preview });
  });
}
