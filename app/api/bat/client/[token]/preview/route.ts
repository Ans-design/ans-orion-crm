export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-response';
import { verifyBatClientAccessToken } from '@/lib/bat/client-access-token';
import { getObject } from '@/lib/storage/object-storage';
import { runApiHandler } from '@/lib/api-guard';

type Ctx = { params: { token: string } };

/** Aperçu fichier BAT pour le portail client (sans session). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  return runApiHandler('bat/client/preview GET', async () => {
    const verified = verifyBatClientAccessToken(ctx.params.token);
    if (!verified) return apiError('Lien invalide ou expiré', 403);

    const proof = await prisma.proof.findUnique({
      where: { id: verified.proofId },
      select: { fileAssetId: true },
    });
    if (!proof?.fileAssetId) return apiError('Aucun fichier BAT', 404);

    const file = await prisma.fileAsset.findUnique({ where: { id: proof.fileAssetId } });
    if (!file) return apiError('Fichier introuvable', 404);

    const buffer = file.storageKey
      ? await getObject(file.storageKey)
      : Buffer.from(file.content, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  });
}
