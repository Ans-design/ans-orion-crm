export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { created } from '@/lib/server/http/api-response';
import {
  createCmRelance,
  createMessageTemplate,
  listCmRelances,
  listMessageTemplates,
  markRelanceSent,
} from '@/lib/services/cm-service';
import { markRelanceSentSchema } from '@/lib/server/modules/cm/cm-relances.validation';
import { cmRelanceCreateSchema, cmRelancePostSchema } from '@/lib/server/modules/cm/cm-relances-post.validation';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('cm:read');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  if (searchParams.get('templates') === '1') {
    try {
      return NextResponse.json(await listMessageTemplates(searchParams.get('category') || undefined));
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur templates'), 500);
    }
  }

  try {
    const relances = await listCmRelances({
      statut: searchParams.get('statut') || undefined,
      overdue: searchParams.get('overdue') === '1',
    });
    return NextResponse.json(relances);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur relances'), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('cm:write');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(cmRelancePostSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    if ('action' in parsed.data && parsed.data.action === 'template') {
      const tpl = await createMessageTemplate({
        name: parsed.data.name,
        canal: parsed.data.canal,
        category: parsed.data.category,
        subject: parsed.data.subject,
        body: parsed.data.body,
      });
      return created(tpl);
    }

    const relanceParsed = cmRelanceCreateSchema.safeParse(parsed.data);
    if (!relanceParsed.success) return apiError('Requête relance invalide', 400);

    const relance = await createCmRelance({
      ...relanceParsed.data,
      dueDate: relanceParsed.data.dueDate ? new Date(relanceParsed.data.dueDate) : null,
      assignedTo: auth.userName,
    });
    return created(relance);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création relance'), 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('cm:write');
  if ('error' in auth) return auth.error;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return apiError('id requis', 400);

  try {
    const parsed = parseBody(markRelanceSentSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const relance = await markRelanceSent(id);
    return NextResponse.json(relance);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur relance'), 500);
  }
}
