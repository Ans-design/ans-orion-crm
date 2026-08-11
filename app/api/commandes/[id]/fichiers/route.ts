export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { logAudit } from '@/lib/audit';
import { resolveParams } from '@/lib/api/route-params';
import { created } from '@/lib/server/http/api-response';
import {
  buildStorageKey,
  isObjectStorageConfigured,
  maxUploadBytes,
  uploadObject,
} from '@/lib/storage/object-storage';
import {
  FILE_STATUTS,
  FILE_VERSION_LABELS,
  isAllowedProExtension,
} from '@/lib/constants/file-assets';
import { syncGpaoOnFileUploaded } from '@/lib/services/bat-gpao-sync';
import { scheduleFilePreview } from '@/lib/services/file-preview-service';
import { z } from 'zod';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  const fichiers = await prisma.fileAsset.findMany({
    where: { commandeId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      mimeType: true,
      sizeBytes: true,
      category: true,
      versionLabel: true,
      statut: true,
      uploadedBy: true,
      createdAt: true,
      proofId: true,
      storageKey: true,
    },
  });

  return NextResponse.json(fichiers.map(({ storageKey, ...f }) => ({ ...f, remote: Boolean(storageKey) })),
  );
}

const uploadMetaSchema = z.object({
  category: z.string().optional(),
  versionLabel: z.string().optional(),
  statut: z.enum(FILE_STATUTS as unknown as [string, ...string[]]).optional(),
  proofId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  try {
    const commande = await prisma.commande.findUnique({
      where: { id: id },
      select: { id: true, clientId: true },
    });
    if (!commande) return apiError('Commande introuvable', 404);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return apiError('Fichier requis', 400);

    if (!isAllowedProExtension(file.name)) {
      return apiError('Extension non autorisée pour fichiers pro', 400);
    }

    const maxBytes = maxUploadBytes();
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      return apiError(`Fichier trop volumineux (max ${mb} Mo)`, 400);
    }

    const metaRaw = {
      category: String(form.get('category') || 'source'),
      versionLabel: String(form.get('versionLabel') || '') || undefined,
      statut: String(form.get('statut') || '') || undefined,
      proofId: String(form.get('proofId') || '') || null,
    };
    const meta = uploadMetaSchema.parse(metaRaw);

    if (meta.versionLabel && !FILE_VERSION_LABELS.includes(meta.versionLabel as typeof FILE_VERSION_LABELS[number])) {
      return apiError('Libellé de version invalide', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    const useRemote = isObjectStorageConfigured();

    const asset = await prisma.fileAsset.create({
      data: {
        commandeId: id,
        clientId: commande.clientId,
        name: file.name,
        mimeType,
        sizeBytes: file.size,
        category: meta.category ?? 'source',
        versionLabel: meta.versionLabel ?? null,
        statut: meta.statut ?? 'Reçu',
        proofId: meta.proofId,
        content: useRemote ? '' : buffer.toString('base64'),
        uploadedBy: auth.userName,
      },
    });

    if (useRemote) {
      const storageKey = buildStorageKey({
        clientId: commande.clientId,
        fileName: file.name,
        assetId: asset.id,
      });
      await uploadObject(storageKey, buffer, mimeType);
      await prisma.fileAsset.update({
        where: { id: asset.id },
        data: { storageKey },
      });
    }

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'FILE_UPLOAD',
      entity: 'FileAsset',
      entityId: asset.id,
      entityLabel: file.name,
      details: { commandeId: id, versionLabel: meta.versionLabel },
    });

    await syncGpaoOnFileUploaded(id);

    scheduleFilePreview(asset.id);

    return NextResponse.json(
      {
        id: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        category: asset.category,
        versionLabel: asset.versionLabel,
        statut: asset.statut,
        createdAt: asset.createdAt,
        remote: useRemote,
      });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur upload fichier'), 500);
  }
}
