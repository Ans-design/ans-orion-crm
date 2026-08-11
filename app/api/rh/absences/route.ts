export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRhAdmin, requireRhEmployee } from '@/lib/server/auth/rh-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { created } from '@/lib/server/http/api-response';
import {
  createAbsenceInputSchema,
  reviewAbsenceInputSchema,
} from '@/lib/server/modules/rh/rh.validation';
import {
  isRhPrivilegedRole,
  resolveSessionEmployeeId,
} from '@/lib/server/modules/rh/rh-employee-scope';
import { getRhSessionMatricule } from '@/lib/server/modules/rh/rh-session';
import {
  createAbsenceRecord,
  listAbsenceRecords,
  parseAbsenceListQuery,
  reviewAbsenceRecord,
} from '@/lib/server/modules/rh/rh-absences.service';

export async function GET(req: NextRequest) {
  const auth = await requireRhEmployee();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh absences GET', async () => {
    const query = parseAbsenceListQuery(req.nextUrl.searchParams);
    if (!isRhPrivilegedRole(auth.role)) {
      const matricule = await getRhSessionMatricule();
      const selfId = await resolveSessionEmployeeId(auth.userId!, matricule);
      if (!selfId) return NextResponse.json([]);
      query.employeeId = selfId;
    }
    const absences = await listAbsenceRecords(query);
    return NextResponse.json(absences);
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRhEmployee();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh absences POST', async (): Promise<Response> => {
    const parsed = parseBody(createAbsenceInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await createAbsenceRecord(parsed.data, { userId: auth.userId! });
      if (!result.ok) return apiError(result.message, 400);
      return created(result.absence);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur demande congé'), 500);
    }
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRhAdmin();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh absences PATCH', async (): Promise<Response> => {
    const parsed = parseBody(reviewAbsenceInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await reviewAbsenceRecord(parsed.data, auth.userName);
      return created(result.absence);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur validation absence'), 500);
    }
  });
}
