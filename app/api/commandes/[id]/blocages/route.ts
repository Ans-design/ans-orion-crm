export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { resolveParams } from '@/lib/api/route-params';
import { created } from '@/lib/server/http/api-response';
import {
  commandeBlocagePostSchema,
  createCommandeBlocageSchema,
  resolveCommandeBlocageSchema,
} from '@/lib/server/modules/commandes/commandes-blocages.validation';
import {
  createCommandeBlocage,
  listCommandeBlocages,
  resolveCommandeBlocage,
} from '@/lib/services/commande-blocage-service';
import { runApiHandler } from '@/lib/api-guard';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('commandes:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('commandes/[id]/blocages GET', async () => {
    const blocages = await listCommandeBlocages(id);
    return NextResponse.json({ blocages, actifs: blocages.filter((b) => b.statut === 'actif') });
  });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('commandes:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('commandes/[id]/blocages POST', async (): Promise<Response> => {
    const parsed = parseBody(commandeBlocagePostSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    if ('action' in parsed.data && parsed.data.action === 'resolve') {
      const resolveParsed = resolveCommandeBlocageSchema.safeParse(parsed.data);
      if (!resolveParsed.success) return apiError('Requête resolve invalide', 400);

      const blocage = await resolveCommandeBlocage(resolveParsed.data.blocageId, {
        commandeId: id,
        resolvedBy: auth.userId,
        resolveNote: resolveParsed.data.resolveNote,
      });
      if (!blocage) return apiError('Blocage introuvable ou déjà résolu', 404);
      return created(blocage);
    }

    const createParsed = createCommandeBlocageSchema.safeParse(parsed.data);
    if (!createParsed.success) return apiError('Requête blocage invalide', 400);

    const blocage = await createCommandeBlocage(id, {
      ...createParsed.data,
      createdBy: auth.userId,
      createdByName: auth.userName,
    });
    return created(blocage);
  });
}
