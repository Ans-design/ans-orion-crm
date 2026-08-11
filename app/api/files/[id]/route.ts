export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { logAudit } from '@/lib/audit';
import { deleteObject, getObject } from '@/lib/storage/object-storage';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:read');
  if ('error' in auth) return auth.error;

  try {
    const file = await prisma.fileAsset.findUnique({ where: { id: id } });
    if (!file) return apiError('Fichier introuvable', 404);

    const buffer = file.storageKey
      ? await getObject(file.storageKey)
      : Buffer.from(file.content, 'base64');

    const download = req.nextUrl.searchParams.get('download') === '1';
    const nameLower = (file.name || '').toLowerCase();
    const isSvg =
      nameLower.endsWith('.svg') ||
      file.mimeType === 'image/svg+xml' ||
      file.mimeType === 'text/svg';
    // SEC-06 : SVG jamais inline (XSS stocké)
    const disposition = download || isSvg ? 'attachment' : 'inline';
    const contentType = isSvg ? 'application/octet-stream' : file.mimeType;

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'FILE_DOWNLOAD',
      entity: 'FileAsset',
      entityId: file.id,
      entityLabel: file.name,
      details: { commandeId: file.commandeId },
    });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(file.name)}"`,
        'Content-Length': String(buffer.length),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[files GET]', error);
    return apiError(safeErrorMessage(error), 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  const file = await prisma.fileAsset.findUnique({ where: { id: id } });
  if (!file) return apiError('Fichier introuvable', 404);

  if (file.storageKey) {
    try {
      await deleteObject(file.storageKey);
    } catch (e) {
      console.error('S3 delete failed:', e);
    }
  }

  await prisma.fileAsset.delete({ where: { id: id } });

  await logAudit({
    userId: auth.userId,
    userName: auth.userName,
    action: 'DELETE',
    entity: 'FileAsset',
    entityId: file.id,
    entityLabel: file.name,
    details: { commandeId: file.commandeId, category: file.category },
  });

  return NextResponse.json({ ok: true });
}
