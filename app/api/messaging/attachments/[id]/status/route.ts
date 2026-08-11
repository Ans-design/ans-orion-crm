export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingWrite } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { attachmentStatusInputSchema } from '@/lib/server/modules/messaging/attachments.validation';
import { patchAttachmentStatus } from '@/lib/server/modules/messaging/attachments.service';
import { resolveParams } from '@/lib/api/route-params';

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging attachment status PATCH', async (): Promise<Response> => {
    const parsed = parseBody(attachmentStatusInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const att = await patchAttachmentStatus(id, parsed.data.status, {
        userId: auth.userId,
        userName: auth.userName,
        role: auth.role,
      });
      return NextResponse.json(att);
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return apiError('Permission insuffisante', 403);
      }
      return apiError(safeErrorMessage(error, 'Erreur statut fichier'), 500);
    }
  });
}
