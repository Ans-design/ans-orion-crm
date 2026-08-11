export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { z } from 'zod';
import { created } from '@/lib/server/http/api-response';
import {
  createReclamationRecord,
  listReclamations,
} from '@/lib/server/modules/reclamations/reclamations.service';

const createReclamationSchema = z.object({
  clientId: z.string().min(1),
  subject: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  priorite: z.enum(['Basse', 'Normale', 'Haute', 'Urgente']).optional(),
  commandeId: z.string().min(1).optional().nullable(),
  employeeId: z.string().min(1).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requirePermission('clients:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('reclamations GET', async () => {
    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '25');
    const data = await listReclamations({
      clientId: searchParams.get('clientId') || undefined,
      commandeId: searchParams.get('commandeId') || undefined,
      statut: searchParams.get('statut') || undefined,
      statsOnly: searchParams.get('stats') === '1',
      trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 25,
    });
    return NextResponse.json(data);
  }, { fallbackResponse: { items: [], total: 0, page: 1, pageSize: 25 } });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('reclamations POST', async (): Promise<Response> => {
    const parsed = parseBody(createReclamationSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const reclamation = await createReclamationRecord(parsed.data);
      return created(reclamation);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur création';
      return apiError(msg, 400);
    }
  });
}
