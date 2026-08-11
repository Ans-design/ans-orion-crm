export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { z } from 'zod';
import { resolveParams } from '@/lib/api/route-params';
import {
  getOrCreateQualiteControle,
  saveQualiteChecklist,
  submitQualiteDecision,
} from '@/lib/services/qualite-checklist-service';

const checklistItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  checked: z.boolean(),
  note: z.string().optional(),
});

const patchSchema = z.object({
  checklist: z.array(checklistItemSchema),
  commentaire: z.string().optional(),
  cause: z.string().optional(),
  actionCorrective: z.string().optional(),
  proofPhotoUrl: z.string().nullable().optional(),
  cout: z.number().optional(),
});

const postSchema = z.object({
  action: z.enum(['conforme', 'non_conforme', 'reserve', 'refaire']),
  checklist: z.array(checklistItemSchema),
  motif: z.string().optional(),
  cause: z.string().optional(),
  actionCorrective: z.string().optional(),
  proofPhotoUrl: z.string().nullable().optional(),
  cout: z.number().optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: { commandeId: string } | Promise<{ commandeId: string }> },
) {
  const { commandeId } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/qualite GET', async () => {
    const controle = await getOrCreateQualiteControle(commandeId);
    return NextResponse.json({ controle });
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { commandeId: string } | Promise<{ commandeId: string }> },
) {
  const { commandeId } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/qualite PATCH', async (): Promise<Response> => {
    const parsed = parseBody(patchSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const controle = await saveQualiteChecklist(
      commandeId,
      parsed.data,
      { userId: auth.userId, userName: auth.userName },
    );
    return NextResponse.json({ controle });
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: { commandeId: string } | Promise<{ commandeId: string }> },
) {
  const { commandeId } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/qualite POST', async (): Promise<Response> => {
    const parsed = parseBody(postSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await submitQualiteDecision(
      commandeId,
      parsed.data.action,
      parsed.data,
      { userId: auth.userId, userName: auth.userName },
    );

    if ('error' in result && result.error) {
      return apiError(result.error, result.error.includes('checklist') ? 400 : 404);
    }
    return NextResponse.json(result);
  });
}
