export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { created } from '@/lib/server/http/api-response';
import {
  addCampaignPost,
  createCmCampaign,
  getCmStats,
  listCmCampaigns,
} from '@/lib/services/cm-service';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  platform: z.string().optional(),
  statut: z.string().optional(),
  objectif: z.string().max(500).optional().nullable(),
  budget: z.number().optional().nullable(),
  clientId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  post: z.object({
    titre: z.string().min(1),
    contenu: z.string().optional().nullable(),
    platform: z.string().optional(),
    scheduledAt: z.string().optional().nullable(),
  }).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requirePermission('cm:read');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  if (searchParams.get('stats') === '1') {
    try {
      return NextResponse.json(await getCmStats());
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur stats CM'), 500);
    }
  }

  try {
    return NextResponse.json(await listCmCampaigns({ statut: searchParams.get('statut') || undefined }));
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur campagnes'), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('cm:write');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(createSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const { post, ...data } = parsed.data;
    const campaign = await createCmCampaign({ ...data, createdBy: auth.userName });

    if (post) {
      await addCampaignPost(campaign.id, {
        ...post,
        scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
      });
    }

    return created(campaign);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création campagne'), 500);
  }
}
