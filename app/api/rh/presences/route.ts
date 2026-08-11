export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRhAdmin, requireRhEmployee } from '@/lib/server/auth/rh-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { presenceActionInputSchema } from '@/lib/server/modules/rh/rh.validation';
import {
  listPresenceRecords,
  parsePresenceListQuery,
  runPresenceAction,
} from '@/lib/server/modules/rh/rh-presences.service';

export async function GET(req: NextRequest) {
  const auth = await requireRhAdmin();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh presences GET', async () => {
    const presences = await listPresenceRecords(parsePresenceListQuery(req.nextUrl.searchParams));
    return NextResponse.json(presences);
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRhEmployee();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh presences POST', async (): Promise<Response> => {
    const parsed = parseBody(presenceActionInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const outcome = await runPresenceAction(parsed.data, { userId: auth.userId });
      if (!outcome.ok) return apiError(outcome.message, 400);
      return NextResponse.json(outcome.result);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur pointage'), 500);
    }
  });
}
