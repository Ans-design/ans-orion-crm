export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import {
  getStudioStats,
  listStudioBriefs,
  syncBriefForCommande,
} from '@/lib/services/studio-service';

const createSchema = z.object({
  commandeId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const auth = await requirePermission('bat:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('studio/briefs GET', async () => {
    const { searchParams } = req.nextUrl;
    if (searchParams.get('stats') === '1') {
      return NextResponse.json(await getStudioStats());
    }

    const briefs = await listStudioBriefs({
      statut: searchParams.get('statut') || undefined,
      commandeId: searchParams.get('commande') || searchParams.get('commandeId') || undefined,
    });
    return NextResponse.json(briefs);
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('bat:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('studio/briefs POST', async (): Promise<Response> => {
    const parsed = parseBody(createSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await syncBriefForCommande(parsed.data.commandeId);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  });
}
