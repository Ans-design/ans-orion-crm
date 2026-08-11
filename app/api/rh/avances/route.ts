export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRhPayrollRead, requireRhPayrollWrite } from '@/lib/server/auth/rh-access';import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { created } from '@/lib/server/http/api-response';
import {
  createAdvanceInputSchema,
  updateAdvanceInputSchema,
} from '@/lib/server/modules/rh/rh-advances.validation';
import {
  createAdvanceRecord,
  listAdvanceRecords,
  parseAdvanceListQuery,
  updateAdvanceRecord,
} from '@/lib/server/modules/rh/rh-advances.service';

export async function GET(req: NextRequest) {
  const auth = await requireRhPayrollRead();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh avances GET', async () => {
    try {
      const data = await listAdvanceRecords(parseAdvanceListQuery(req.nextUrl.searchParams));
      return NextResponse.json(data);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur avances'), 500);
    }
  }, { fallbackResponse: { advances: [], stats: null } });
}

export async function POST(req: NextRequest) {
  const auth = await requireRhPayrollWrite();  if ('error' in auth) return auth.error;

  return runApiHandler('rh avances POST', async (): Promise<Response> => {
    const parsed = parseBody(createAdvanceInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const advance = await createAdvanceRecord(parsed.data, auth.userId);
      return created(advance);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur création avance'), 500);
    }
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRhPayrollWrite();  if ('error' in auth) return auth.error;

  return runApiHandler('rh avances PATCH', async (): Promise<Response> => {
    const parsed = parseBody(updateAdvanceInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await updateAdvanceRecord(parsed.data);
      return NextResponse.json(result);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur mise à jour avance'), 500);
    }
  });
}
