export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingAuth } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { downloadConversationAttachment } from '@/lib/server/modules/messaging/attachments.service';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingAuth();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging attachment download GET', async (): Promise<Response> => {
    try {
      const { buffer, att } = await downloadConversationAttachment(id, auth.userId, auth.userName);
      const inline = _req.nextUrl.searchParams.get('inline') === '1';
      const isPreviewable = att.mimeType.startsWith('image/') || att.mimeType.startsWith('audio/') || att.mimeType.startsWith('video/');
      const disposition = inline && isPreviewable
        ? `inline; filename="${encodeURIComponent(att.originalFileName)}"`
        : `attachment; filename="${encodeURIComponent(att.originalFileName)}"`;
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': att.mimeType,
          'Content-Disposition': disposition,
          'X-Checksum-Sha256': att.checksumSha256,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'INTEGRITY_FAIL') {
        return apiError('Intégrité fichier compromise', 409);
      }
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return apiError('Fichier introuvable', 404);
      }
      return apiError(safeErrorMessage(error, 'Erreur téléchargement'), 500);
    }
  });
}
