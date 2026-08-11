export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { parseBody } from '@/lib/validators/common';
import { created } from '@/lib/server/http/api-response';
import {
  cmCampaignPatchSchema,
  cmCampaignPatchStatutSchema,
  cmCampaignPostSchema,
} from '@/lib/server/modules/cm/cm-campagnes.validation';
import { addCampaignPost, getCmCampaign, updateCampaignPost } from '@/lib/services/cm-service';
import { prisma } from '@/lib/prisma';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = await requirePermission('cm:read');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  try {
    const campaign = await getCmCampaign(id);
    if (!campaign) return apiError('Campagne introuvable', 404);
    return NextResponse.json(campaign);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur campagne'), 500);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = await requirePermission('cm:write');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  try {
    const parsed = parseOr400(cmCampaignPostSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const post = await addCampaignPost(id, {
      ...parsed.data,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    });
    return created(post);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur ajout post'), 500);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = await requirePermission('cm:write');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  try {
    const body = await req.json();
    const statutOnly = cmCampaignPatchStatutSchema.safeParse(body);
    if (statutOnly.success) {
      await prisma.cmCampaign.update({
        where: { id },
        data: { statut: statutOnly.data.statut },
      });
      return NextResponse.json(await getCmCampaign(id));
    }

    const parsed = parseBody(cmCampaignPatchSchema, body);
    if (!parsed.ok) return apiError(parsed.error, 400);

    if ('postId' in parsed.data) {
      await updateCampaignPost(parsed.data.postId, {
        statut: parsed.data.statut,
        titre: parsed.data.titre,
        contenu: parsed.data.contenu,
      });
      return NextResponse.json(await getCmCampaign(id));
    }

    return apiError('Requête PATCH invalide', 400);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour'), 500);
  }
}
