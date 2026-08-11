export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requireApiAccess } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { z } from 'zod';
import { createTournee, listTournees } from '@/lib/logistics/tournee-service';
import { created } from '@/lib/server/http/api-response';

const createTourneeSchema = z.object({
  livreur: z.string().min(1).max(100),
  dateTournee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  livraisonIds: z.array(z.string().min(1)).min(1),
  zone: z.string().max(80).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('livraisons:read');
  if ('error' in auth) return auth.error;

  const date = new URL(req.url).searchParams.get('date') ?? undefined;
  const tournees = await listTournees(date);
  return NextResponse.json({ tournees, date: date ?? new Date().toISOString().slice(0, 10) });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAccess('livraisons:write', req);
  if ('error' in auth) return auth.error;

  const parsed = parseBody(createTourneeSchema, await req.json());
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    const tournee = await createTournee({
      ...parsed.data,
      userId: auth.userId,
    });
    return created(tournee);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création tournée'), 500);
  }
}
