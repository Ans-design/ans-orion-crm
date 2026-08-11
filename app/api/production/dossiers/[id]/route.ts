export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { getProductionDossier, resolveIncident, updateDossierEtape } from '@/lib/services/gpao-dossier-service';
import { patchDossierEtapeSchema } from '@/lib/server/modules/production/production-dossiers.validation';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/dossiers/[id] GET', async (): Promise<Response> => {
    const dossier = await getProductionDossier(id);
    if (!dossier) return apiError('Dossier introuvable', 404);
    return NextResponse.json(dossier);
  });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/dossiers/[id] PATCH', async (): Promise<Response> => {
    const parsed = parseBody(patchDossierEtapeSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    if (parsed.data.resolveIncidentId) {
      await resolveIncident(parsed.data.resolveIncidentId);
    }

    const dossier = await updateDossierEtape(
      id,
      parsed.data.etapeId,
      {
        statut: parsed.data.statut,
        responsable: parsed.data.responsable,
        commentaire: parsed.data.commentaire,
        bloque: parsed.data.bloque,
      },
      { userId: auth.userId, userName: auth.userName },
    );
    return NextResponse.json(dossier);
  });
}
