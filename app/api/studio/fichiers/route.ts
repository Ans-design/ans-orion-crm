export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { logAudit } from '@/lib/audit';
import { created } from '@/lib/server/http/api-response';
import {
  buildStorageKey,
  isObjectStorageConfigured,
  maxUploadBytes,
  uploadObject,
} from '@/lib/storage/object-storage';
import { prisma } from '@/lib/prisma';
import { linkFileToBrief, listStudioFiles } from '@/lib/services/studio-service';
import { scheduleFilePreview } from '@/lib/services/file-preview-service';
import { validateUploadBuffer } from '@/lib/uploads/validate-upload';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('bat:read');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  try {
    const files = await listStudioFiles({
      briefId: searchParams.get('briefId') || undefined,
      commandeId: searchParams.get('commandeId') || searchParams.get('commande') || undefined,
      category: searchParams.get('category') || undefined,
    });
    return NextResponse.json(files);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur fichiers studio'), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('bat:write');
  if ('error' in auth) return auth.error;

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const briefId = String(form.get('briefId') || '') || null;
    const clientId = String(form.get('clientId') || '') || null;
    const commandeId = String(form.get('commandeId') || '') || null;
    const category = String(form.get('category') || 'source');
    const versionLabel = String(form.get('versionLabel') || '') || null;
    const maxBytes = maxUploadBytes();

    if (!file) return apiError('Fichier requis', 400);
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      return apiError(`Fichier trop volumineux (max ${mb} Mo)`, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = validateUploadBuffer(file.name, buffer, { maxBytes, rejectSvg: true });
    if (!validated.ok) return apiError(validated.reason, validated.status);

    const mimeType = validated.detectedMime;
    const useRemote = isObjectStorageConfigured();

    const asset = await prisma.fileAsset.create({
      data: {
        clientId,
        commandeId,
        studioBriefId: briefId,
        name: validated.safeFileName,
        mimeType,
        sizeBytes: file.size,
        category,
        versionLabel,
        content: useRemote ? '' : buffer.toString('base64'),
        uploadedBy: auth.userName,
      },
    });

    if (useRemote) {
      const storageKey = buildStorageKey({ clientId, fileName: validated.safeFileName, assetId: asset.id });
      await uploadObject(storageKey, buffer, mimeType);
      await prisma.fileAsset.update({ where: { id: asset.id }, data: { storageKey } });
    }

    if (briefId) {
      await linkFileToBrief(asset.id, briefId, versionLabel ?? undefined);
      await prisma.studioBrief.update({
        where: { id: briefId },
        data: { fichiersManquants: false, statut: 'En cours' },
      });
    }

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'FILE_UPLOAD',
      entity: 'FileAsset',
      entityId: asset.id,
      entityLabel: file.name,
    });

    scheduleFilePreview(asset.id);

    return NextResponse.json({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      versionLabel: asset.versionLabel,
      studioBriefId: briefId,
      createdAt: asset.createdAt,
    });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur upload studio'), 500);
  }
}
