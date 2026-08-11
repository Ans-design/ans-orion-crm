export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { safeErrorMessage } from '@/lib/api-response';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { lateDeclarationInputSchema } from '@/lib/server/modules/rh/rh.validation';
import {
  declareLateArrival,
  getLateArrivalStatus,
} from '@/lib/server/modules/rh/rh-late-arrival.service';
import { getRhSessionMatricule } from '@/lib/server/modules/rh/rh-session';
import { fromError } from '@/lib/server/http/api-response';

async function readLateArrivalGate(auth: AuthApiContext) {
  try {
    const matricule = await getRhSessionMatricule();
    const gate = await getLateArrivalStatus(auth.userId, matricule);
    return ok(gate);
  } catch (error) {
    console.error('[LATE_ARRIVAL_GATE_ERROR]', error);
    // Fail-closed : ne pas laisser passer le retard si le contrôle est indisponible.
    return fromError(error, safeErrorMessage(error, 'Contrôle retard indisponible'));
  }
}

export const GET = withAuthApi(
  'rh late-arrival GET',
  readLateArrivalGate,
  {
    skipRhAttendance: true,
  },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'rh late-arrival POST',
    async (auth, request) => {
      const parsed = parseBody(lateDeclarationInputSchema, await request.json(), 'rh late-arrival POST');
      if (!parsed.ok) return parsed.response;

      try {
        const matricule = await getRhSessionMatricule();
        const result = await declareLateArrival(auth.userId, parsed.data, matricule);
        return ok(result);
      } catch (error) {
        console.error('[LATE_ARRIVAL_GATE_ERROR]', error);
        return fromError(error, safeErrorMessage(error, 'Erreur déclaration retard'));
      }
    },
    { skipRhAttendance: true },
  )(req);
}
