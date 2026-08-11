export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { created } from '@/lib/server/http/api-response';
import {
  createProductionIncident,
  getGpaoStats,
  listProductionDossiers,
  syncDossierForCommande,
} from '@/lib/services/gpao-dossier-service';
import {
  createDossierSchema,
  parseDossierListQuery,
  productionIncidentSchema,
} from '@/lib/server/modules/production/production-dossiers.validation';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/dossiers GET', async () => {
    const query = parseDossierListQuery(req.nextUrl.searchParams);
    if (query.stats === '1') {
      return NextResponse.json(await getGpaoStats());
    }
    const result = await listProductionDossiers({
      statut: query.statut,
      commandeId: query.commandeId,
      page: query.page,
      pageSize: query.pageSize,
      etapeNom: query.etapeNom,
    });
    return NextResponse.json(result);
  }, { fallbackResponse: { items: [], total: 0, page: 1, pageSize: 25, totalPages: 1 } });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/dossiers POST', async (): Promise<Response> => {
    const body = await req.json();

    if (body?.action === 'incident') {
      const parsed = parseBody(productionIncidentSchema, body);
      if (!parsed.ok) return apiError(parsed.error, 400);
      const incident = await createProductionIncident({
        dossierId: parsed.data.dossierId,
        title: parsed.data.title,
        severity: parsed.data.severity,
        description: parsed.data.description,
        reportedBy: auth.userName,
      });
      return created(incident);
    }

    const parsed = parseBody(createDossierSchema, body);
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await syncDossierForCommande(parsed.data.commandeId, {
      priorite: parsed.data.priorite,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  });
}
