export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { created } from '@/lib/server/http/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { createDevisInputSchema } from '@/lib/server/modules/devis/devis.validation';
import {
  createDevisRecord,
  getDevisSummary,
  listDevis,
  notifyDevisCreated,
  parseDevisListQuery,
} from '@/lib/server/modules/devis/devis.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('devis:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('devis GET', async () => {
    const query = parseDevisListQuery(new URL(req.url).searchParams);

    if (query.summary) {
      return NextResponse.json(await getDevisSummary());
    }

    const result = await listDevis(query);
    return NextResponse.json(result);
  }, { fallback: { devis: [], total: 0 } });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('devis:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('devis POST', async (): Promise<Response> => {
    const parsed = parseBody(createDevisInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const { devis, totalTTC } = await createDevisRecord(parsed.data);

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'CREATE',
      entity: 'Devis',
      entityId: devis.id,
      entityLabel: devis.numero,
      details: { totalTTC },
    });

    await notifyDevisCreated(devis, totalTTC, {
      userId: auth.userId,
      userName: auth.userName,
      role: auth.role,
    });

    return created(devis);
  });
}
