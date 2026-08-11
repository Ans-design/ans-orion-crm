export const dynamic = 'force-dynamic';



import { NextRequest, NextResponse } from 'next/server';

import { requireRhAdmin, requireRhWrite } from '@/lib/server/auth/rh-access';
import { requirePermission } from '@/lib/auth-utils';

import { apiError, safeErrorMessage } from '@/lib/api-response';

import { parseBody } from '@/lib/validators/common';

import { runApiHandler } from '@/lib/api-guard';

import { performanceEvaluationInputSchema } from '@/lib/server/modules/rh/rh.validation';

import {

  getRhPerformanceDashboard,

  saveRhPerformanceEvaluation,

} from '@/lib/server/modules/rh/rh-performance.service';



export async function GET(req: NextRequest) {

  const auth = await requireRhAdmin();

  if ('error' in auth) return auth.error;



  const search = new URL(req.url).searchParams.get('q') || undefined;



  return runApiHandler('rh performance GET', async () => {

    try {

      const data = await getRhPerformanceDashboard(search);

      return NextResponse.json(data);

    } catch (error) {

      return apiError(safeErrorMessage(error, 'Erreur performance'), 500);

    }

  }, { fallbackResponse: { rows: [], leaderboard: [] } });

}



export async function PATCH(req: NextRequest) {

  const auth = await requireRhWrite();

  if ('error' in auth) return auth.error;

  const { userId, userName } = auth;



  return runApiHandler('rh performance PATCH', async (): Promise<Response> => {

    const parsed = parseBody(performanceEvaluationInputSchema, await req.json());

    if (!parsed.ok) return apiError(parsed.error, 400);



    try {

      const ev = await saveRhPerformanceEvaluation(parsed.data, userName ?? userId);

      return NextResponse.json(ev);

    } catch (error) {

      return apiError(safeErrorMessage(error, 'Erreur évaluation'), 500);

    }

  });

}

