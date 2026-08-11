export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireRhAdmin,
  requireRhPayrollWrite,
  requireRhWrite,
} from '@/lib/server/auth/rh-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { updateEmployeeInputSchema } from '@/lib/server/modules/rh/rh.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  getEmployeeDetail,
  updateEmployeeRecord,
} from '@/lib/server/modules/rh/rh-employees.service';
import {
  hasPayrollMutationFields,
  stripEmployeePayrollFields,
} from '@/lib/auth/rh-payroll-access';

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireRhAdmin();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh employe GET', async () => {
    const employee = await getEmployeeDetail(id);
    if (!employee) return apiError('Employé introuvable', 404);
    return NextResponse.json(stripEmployeePayrollFields(employee, auth.role));
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireRhWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh employe PATCH', async (): Promise<Response> => {
    const parsed = parseBody(updateEmployeeInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    if (hasPayrollMutationFields(parsed.data as Record<string, unknown>)) {
      const payrollAuth = await requireRhPayrollWrite();
      if ('error' in payrollAuth) return payrollAuth.error;
    }

    try {
      const employee = await updateEmployeeRecord(id, parsed.data);
      return NextResponse.json(stripEmployeePayrollFields(employee, auth.role));
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur mise à jour employé'), 500);
    }
  });
}
