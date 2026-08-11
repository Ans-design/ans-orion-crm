export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyPermission } from '@/lib/auth-utils';
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
import { isAllowedProExtension } from '@/lib/constants/file-assets';
import { scheduleFilePreview } from '@/lib/services/file-preview-service';

async function assertTaskAccess(taskId: string) {
  const task = await prisma.metierTask.findUnique({
    where: { id: taskId },
    select: { id: true, commandeId: true, commande: { select: { clientId: true } } },
  });
  if (!task) return null;
  return task;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireAnyPermission('commandes:read', 'production:read');
  if ('error' in auth) return auth.error;

  const task = await assertTaskAccess(id);
  if (!task) return apiError('Tâche introuvable', 404);

  const files = await prisma.fileAsset.findMany({
    where: { metierTaskId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, mimeType: true, sizeBytes: true, category: true,
      uploadedBy: true, createdAt: true, storageKey: true,
    },
  });

  return NextResponse.json(files.map(({ storageKey, ...f }) => ({
    ...f,
    remote: Boolean(storageKey),
  })));
}

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireAnyPermission('commandes:write', 'production:write');
  if ('error' in auth) return auth.error;

  const task = await assertTaskAccess(id);
  if (!task) return apiError('Tâche introuvable', 404);

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const category = String(form.get('category') || 'tache');
    const maxBytes = maxUploadBytes();

    if (!file) return apiError('Fichier requis', 400);
    if (!isAllowedProExtension(file.name)) {
      return apiError('Extension non autorisée', 400);
    }
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      return apiError(`Fichier trop volumineux (max ${mb} Mo)`, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    const useRemote = isObjectStorageConfigured();

    let clientId: string | null = null;
    let commandeId = task.commandeId;
    if (commandeId) {
      const cmd = await prisma.commande.findUnique({
        where: { id: commandeId },
        select: { clientId: true },
      });
      clientId = cmd?.clientId ?? null;
    }

    const asset = await prisma.fileAsset.create({
      data: {
        metierTaskId: id,
        clientId,
        commandeId,
        name: file.name,
        mimeType,
        sizeBytes: file.size,
        category,
        content: useRemote ? '' : buffer.toString('base64'),
        uploadedBy: auth.userName,
      },
    });

    if (useRemote) {
      const storageKey = buildStorageKey({ clientId, fileName: file.name, assetId: asset.id });
      await uploadObject(storageKey, buffer, mimeType);
      await prisma.fileAsset.update({ where: { id: asset.id }, data: { storageKey } });
    }

    await prisma.metierTask.update({
      where: { id: id },
      data: { fileAssetId: asset.id },
    });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'FILE_UPLOAD',
      entity: 'MetierTask',
      entityId: id,
      entityLabel: file.name,
      details: { fileAssetId: asset.id },
    });

    scheduleFilePreview(asset.id);

    return NextResponse.json({
      id: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      category: asset.category,
      createdAt: asset.createdAt,
      remote: useRemote,
    });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur upload'), 500);
  }
}
