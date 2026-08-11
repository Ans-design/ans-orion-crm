export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingAuth } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import {
  listConversationGallery,
  mapGalleryError,
} from '@/lib/server/modules/messaging/gallery.service';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingAuth();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging gallery GET', async (): Promise<Response> => {
    try {
      const gallery = await listConversationGallery(id, {
        userId: auth.userId,
        role: auth.role,
      });
      return NextResponse.json(gallery);
    } catch (error) {
      const mapped = mapGalleryError(error);
      if (mapped) return apiError(mapped.message, mapped.status);
      return apiError(safeErrorMessage(error, 'Erreur chargement galerie'), 500);
    }
  }, { fallbackResponse: { attachments: [], links: [], stats: { photos: 0, documents: 0, media: 0, links: 0, total: 0 } } });
}
