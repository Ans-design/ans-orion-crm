export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRhAdmin, requireRhPayrollWrite, requireRhEmployee, requireRhPayrollRead } from '@/lib/server/auth/rh-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { updatePayrollInputSchema } from '@/lib/server/modules/rh/rh-payroll.validation';
import {
  assertOwnEmployeeOrRhAdmin,
} from '@/lib/server/modules/rh/rh-employee-scope';
import { getRhSessionMatricule } from '@/lib/server/modules/rh/rh-session';
import {
  ensurePayrollDefaults,
  getEmployeePayslipPreview,
  getPayrollRecords,
  updatePayrollRecord,
} from '@/lib/server/modules/rh/rh-payroll.service';

export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get('employeeId');
  // Grille paie complète = admin only ; bulletin personnel = employé authentifié
  const auth = employeeId ? await requireRhEmployee() : await requireRhPayrollRead();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh paie GET', async (): Promise<Response> => {
    await ensurePayrollDefaults();
    const targetId = req.nextUrl.searchParams.get('employeeId');
    if (targetId) {
      const matricule = await getRhSessionMatricule();
      const denied = await assertOwnEmployeeOrRhAdmin(
        { userId: auth.userId!, role: auth.role },
        targetId,
        matricule,
      );
      if (denied) return denied;

      const preview = await getEmployeePayslipPreview(
        targetId,
        req.nextUrl.searchParams.get('period') ?? undefined,
      );
      if (!preview) return apiError('Employé introuvable', 404);
      return NextResponse.json(preview);
    }
    const grid = await getPayrollRecords();
    return NextResponse.json(grid);
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRhPayrollWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh paie PATCH', async (): Promise<Response> => {
    const parsed = parseBody(updatePayrollInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const emp = await updatePayrollRecord(parsed.data);
      return NextResponse.json(emp);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur mise à jour paie'), 500);
    }
  });
}
