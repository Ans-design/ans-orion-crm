export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { getPreviewBuffer, scheduleFilePreview } from '@/lib/services/file-preview-service';
import { needsAsyncPreview } from '@/lib/file-preview/preview-utils';
import { prisma } from '@/lib/prisma';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('files/[id]/preview GET', async () => {
    const file = await prisma.fileAsset.findUnique({
      where: { id: id },
      select: { id: true, name: true, previewStatus: true },
    });
    if (!file) return apiError('Fichier introuvable', 404);

    let preview = await getPreviewBuffer(id);

    if (!preview && needsAsyncPreview(file.name)) {
      scheduleFilePreview(id);
      return NextResponse.json(
        { status: 'pending', message: 'Aperçu en cours de génération' },
        { status: 202 },
      );
    }

    if (!preview || preview.status === 'pending') {
      return NextResponse.json(
        { status: 'pending', message: 'Aperçu en cours de génération' },
        { status: 202 },
      );
    }

    return new NextResponse(preview.buffer, {
      headers: {
        'Content-Type': preview.mimeType,
        'Cache-Control': 'public, max-age=3600',
        'X-Preview-Status': preview.status,
      },
    });
  });
}
