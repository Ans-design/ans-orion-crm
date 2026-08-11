export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { mergeClientsInputSchema } from '@/lib/server/modules/clients/clients.validation';
import { mergeClientRecords } from '@/lib/server/modules/clients/clients.service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients merge', async (): Promise<Response> => {
    const parsed = parseBody(mergeClientsInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await mergeClientRecords(parsed.data, {
      userId: auth.userId,
      userName: auth.userName,
    });

    if (!result.ok) return apiError(result.error, 400);
    return NextResponse.json(result);
  });
}
