export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireRhEmployee } from '@/lib/server/auth/rh-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { getEmployeeSelfProfile } from '@/lib/server/modules/rh/rh-profile.service';
import { getRhSessionMatricule } from '@/lib/server/modules/rh/rh-session';

export async function GET() {
  const auth = await requireRhEmployee();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh mon-profil GET', async () => {
    try {
      const matricule = await getRhSessionMatricule();
      const profile = await getEmployeeSelfProfile(auth.userId!, matricule);
      return NextResponse.json(profile);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur profil employé'), 500);
    }
  });
}
