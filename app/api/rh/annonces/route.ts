export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRhEmployee, requireRhWrite } from '@/lib/server/auth/rh-access';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { createRhAnnouncementInputSchema } from '@/lib/server/modules/rh/rh.validation';
import { created } from '@/lib/server/http/api-response';
import {
  createRhAnnouncementRecord,
  listRhAnnouncementRecords,
} from '@/lib/server/modules/rh/rh-announcements.service';

export async function GET() {
  const auth = await requireRhEmployee();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh annonces GET', async () => {
    try {
      const items = await listRhAnnouncementRecords();
      return NextResponse.json(items);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur annonces RH'), 500);
    }
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRhWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('rh annonces POST', async (): Promise<Response> => {
    const parsed = parseBody(createRhAnnouncementInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const item = await createRhAnnouncementRecord(parsed.data, {
        userId: auth.userId,
        userName: auth.userName,
      });
      return created(item);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur publication annonce'), 500);
    }
  });
}
