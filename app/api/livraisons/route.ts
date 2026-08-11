export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/auth-utils';
import { createNotification } from '@/lib/services/notification-service';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { createLivraisonInputSchema } from '@/lib/server/modules/livraisons/livraisons.validation';
import {
  createLivraisonRecord,
  listLivraisons,
  parseLivraisonListQuery,
  syncLivraisonOnCreate,
} from '@/lib/server/modules/livraisons/livraisons.service';
import { created, ok } from '@/lib/server/http/api-response';

export async function GET(req: NextRequest) {
  const auth = await requireApiAccess('livraisons:read', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('livraisons GET', async () => {
    const livraisons = await listLivraisons(parseLivraisonListQuery(new URL(req.url).searchParams));
    return ok(livraisons);
  }, { fallbackResponse: { ok: true, data: [] } });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAccess('livraisons:write', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('livraisons POST', async (): Promise<Response> => {
    const parsed = parseBody(createLivraisonInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await createLivraisonRecord(parsed.data);
    if (!result.ok) return apiError(result.message, 404);

    const { livraison, numero } = result;
    const syncResult = await syncLivraisonOnCreate(parsed.data.commandeId, {
      userId: auth.userId,
      userName: auth.userName,
    });

    await createNotification({
      title: 'Livraison planifiée',
      message: `${numero}${livraison.commande ? ` — ${livraison.commande.numero}` : ''}`,
      link: '/livraisons',
      type: 'info',
      category: 'livraisons',
    });

    return created({
      ...livraison,
      syncWarning: syncResult && 'error' in syncResult ? 'Synchronisation commande partielle' : undefined,
    });
  });
}
