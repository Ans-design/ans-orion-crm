export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBatRead, requireBatWrite } from '@/lib/server/auth/bat-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { resolveParams } from '@/lib/api/route-params';
import { createProofVersionSchema } from '@/lib/server/modules/proofs/proof-versions.validation';
import { created } from '@/lib/server/http/api-response';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requireBatRead();
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  const versions = await prisma.proofVersion.findMany({
    where: { proofId: id },
    orderBy: { createdAt: 'desc' },
  });

  const fileIds = versions.map((v) => v.fileAssetId).filter((fid): fid is string => !!fid);
  const files =
    fileIds.length > 0
      ? await prisma.fileAsset.findMany({
          where: { id: { in: fileIds } },
          select: { id: true, name: true, mimeType: true, sizeBytes: true, versionLabel: true },
        })
      : [];
  const fileMap = Object.fromEntries(files.map((f) => [f.id, f]));

  return NextResponse.json({
    versions: versions.map((v) => ({
      ...v,
      file: v.fileAssetId ? fileMap[v.fileAssetId] ?? null : null,
    })),
  });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requireBatWrite();
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  const parsed = parseBody(createProofVersionSchema, await req.json());
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    const body = parsed.data;
    const proof = await prisma.proof.findUnique({ where: { id } });
    if (!proof) return apiError('BAT introuvable', 404);
    if (proof.locked) return apiError('BAT verrouillé — modification interdite', 403);

    const version = await prisma.proofVersion.create({
      data: {
        proofId: id,
        versionLabel: body.versionLabel,
        statut: body.statut ?? 'Brouillon',
        notes: body.notes,
        fileAssetId: body.fileAssetId,
        createdBy: auth.userName,
      },
    });
    return created(version);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création version BAT'), 500);
  }
}
