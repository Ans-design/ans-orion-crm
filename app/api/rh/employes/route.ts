export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRhAdmin } from '@/lib/server/auth/rh-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { createEmployeeInputSchema } from '@/lib/server/modules/rh/rh.validation';
import { created } from '@/lib/server/http/api-response';
import {
  createEmployeeRecord,
  getRhDashboardStats,
  listEmployeeRecords,
  parseEmployeeListQuery,
} from '@/lib/server/modules/rh/rh-employees.service';
import { stripEmployeePayrollFields } from '@/lib/auth/rh-payroll-access';

export async function GET(req: NextRequest) {
  const auth = await requireRhAdmin();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh employes GET', async () => {
    const query = parseEmployeeListQuery(req.nextUrl.searchParams);
    if (query.stats) {
      return NextResponse.json(await getRhDashboardStats());
    }
    const employees = await listEmployeeRecords(query);
    return NextResponse.json(stripEmployeePayrollFields(employees, auth.role));
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRhAdmin();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh employes POST', async (): Promise<Response> => {
    const parsed = parseBody(createEmployeeInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const employee = await createEmployeeRecord(parsed.data);
      return created(stripEmployeePayrollFields(employee, auth.role));
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur création employé'), 500);
    }
  });
}
