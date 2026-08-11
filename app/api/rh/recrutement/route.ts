export const dynamic = 'force-dynamic';



import { NextRequest, NextResponse } from 'next/server';

import { requireRhAdmin, requireRhWrite } from '@/lib/server/auth/rh-access';
import { requirePermission } from '@/lib/auth-utils';

import { apiError, safeErrorMessage } from '@/lib/api-response';

import { parseBody } from '@/lib/validators/common';

import { runApiHandler } from '@/lib/api-guard';

import { created } from '@/lib/server/http/api-response';
import {

  createRecruitCandidateInputSchema,

  updateRecruitCandidateInputSchema,

} from '@/lib/server/modules/rh/rh.validation';

import {

  createRhRecruitCandidate,

  getRhRecruitmentBoard,

  getRhRecruitmentStatsBoard,

  removeRhRecruitCandidate,

  updateRhRecruitCandidate,

} from '@/lib/server/modules/rh/rh-recruitment.service';



export async function GET(req: NextRequest) {

  const auth = await requireRhAdmin();

  if ('error' in auth) return auth.error;



  const { searchParams } = new URL(req.url);



  return runApiHandler('rh recrutement GET', async () => {

    try {

      if (searchParams.get('stats') === '1') {

        const data = await getRhRecruitmentStatsBoard();

        return NextResponse.json(data);

      }

      const stage = searchParams.get('stage') || undefined;

      const data = await getRhRecruitmentBoard(stage);

      return NextResponse.json(data);

    } catch (error) {

      return apiError(safeErrorMessage(error, 'Erreur recrutement'), 500);

    }

  }, { fallbackResponse: { candidates: [], stages: [] } });

}



export async function POST(req: NextRequest) {

  const auth = await requireRhWrite();

  if ('error' in auth) return auth.error;



  return runApiHandler('rh recrutement POST', async (): Promise<Response> => {

    const parsed = parseBody(createRecruitCandidateInputSchema, await req.json());

    if (!parsed.ok) return apiError(parsed.error, 400);



    try {

      const candidate = await createRhRecruitCandidate(parsed.data);

      return created(candidate);

    } catch (error) {

      return apiError(safeErrorMessage(error, 'Erreur création candidat'), 500);

    }

  });

}



export async function PATCH(req: NextRequest) {

  const auth = await requireRhWrite();

  if ('error' in auth) return auth.error;



  return runApiHandler('rh recrutement PATCH', async (): Promise<Response> => {

    const parsed = parseBody(updateRecruitCandidateInputSchema, await req.json());

    if (!parsed.ok) return apiError(parsed.error, 400);



    try {

      const candidate = await updateRhRecruitCandidate(parsed.data);

      return created(candidate);

    } catch (error) {

      return apiError(safeErrorMessage(error, 'Erreur mise à jour candidat'), 500);

    }

  });

}



export async function DELETE(req: NextRequest) {

  const auth = await requireRhWrite();

  if ('error' in auth) return auth.error;



  const id = new URL(req.url).searchParams.get('id');

  if (!id) return apiError('id requis', 400);



  return runApiHandler('rh recrutement DELETE', async (): Promise<Response> => {

    try {

      const result = await removeRhRecruitCandidate(id);

      return NextResponse.json(result);

    } catch (error) {

      return apiError(safeErrorMessage(error, 'Erreur suppression candidat'), 500);

    }

  });

}

