export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { created } from '@/lib/server/http/api-response';
import {
  declareMaterialWaste,
  getMaterialPlans,
  getMaterialWasteStats,
  listMaterialWastes,
  WASTE_CAUSES,
} from '@/lib/services/material-waste-service';

const createSchema = z.object({
  matiere: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unite: z.string().max(20).optional(),
  cause: z.string().min(1).max(100),
  poste: z.string().max(50).optional(),
  notes: z.string().max(500).optional().nullable(),
  commandeId: z.string().optional().nullable(),
  employeeId: z.string().min(1).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/dechets GET', async () => {
    const { searchParams } = req.nextUrl;
    if (searchParams.get('plans') === '1') {
      const commandeId = searchParams.get('commande') || undefined;
      const plans = await getMaterialPlans({ commandeId });
      return NextResponse.json({ plans });
    }
    if (searchParams.get('stats') === '1') {
      const stats = await getMaterialWasteStats();
      return NextResponse.json({ stats, causes: WASTE_CAUSES });
    }
    const poste = searchParams.get('poste') || undefined;
    const wastes = await listMaterialWastes({ poste, limit: 50 });
    return NextResponse.json({ wastes });
  }, { fallbackResponse: { wastes: [] } });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/dechets POST', async (): Promise<Response> => {
    const parsed = parseBody(createSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const waste = await declareMaterialWaste({
      ...parsed.data,
      declaredBy: auth.userName,
    });
    return created(waste);
  });
}
