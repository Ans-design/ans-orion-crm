export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { ApiError } from '@/lib/server/http/api-error';
import { ok, created } from '@/lib/server/http/api-response';
import {
  buildStorageKey,
  isObjectStorageConfigured,
  maxUploadBytes,
  uploadObject,
} from '@/lib/storage/object-storage';
import { isAllowedProExtension } from '@/lib/constants/file-assets';
import { syncGpaoOnFileUploaded } from '@/lib/services/bat-gpao-sync';
import { scheduleFilePreview } from '@/lib/services/file-preview-service';

async function handleGet(_auth: AuthApiContext, req: NextRequest) {
  const clientId = new URL(req.url).searchParams.get('clientId');
  const commandeId = new URL(req.url).searchParams.get('commandeId');
  if (!clientId && !commandeId) throw ApiError.badRequest('clientId ou commandeId requis');

  const where: { clientId?: string; commandeId?: string } = {};
  if (commandeId) where.commandeId = commandeId;
  else if (clientId) where.clientId = clientId;

  const files = await prisma.fileAsset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, mimeType: true, sizeBytes: true, category: true,
      uploadedBy: true, createdAt: true, commandeId: true, storageKey: true,
      versionLabel: true, statut: true, proofId: true,
    },
  });
  return ok(files.map(({ storageKey, ...f }) => ({
    ...f,
    remote: Boolean(storageKey),
  })));
}

async function handlePost(auth: AuthApiContext, req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const clientId = String(form.get('clientId') || '') || null;
  const commandeId = String(form.get('commandeId') || '') || null;
  const category = String(form.get('category') || 'autre');
  const versionLabel = String(form.get('versionLabel') || '') || null;
  const statut = String(form.get('statut') || 'Reçu');
  const maxBytes = maxUploadBytes();

  if (!file) throw ApiError.badRequest('Fichier requis');
  if (!isAllowedProExtension(file.name)) {
    throw ApiError.badRequest('Extension non autorisée');
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw ApiError.badRequest(`Fichier trop volumineux (max ${mb} Mo)`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || 'application/octet-stream';
  const useRemote = isObjectStorageConfigured();

  const asset = await prisma.fileAsset.create({
    data: {
      clientId,
      commandeId,
      name: file.name,
      mimeType,
      sizeBytes: file.size,
      category,
      versionLabel,
      statut,
      content: useRemote ? '' : buffer.toString('base64'),
      uploadedBy: auth.userName,
    },
  });

  if (useRemote) {
    const storageKey = buildStorageKey({
      clientId,
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
  });

  if (commandeId) await syncGpaoOnFileUploaded(commandeId);

  scheduleFilePreview(asset.id);

  return created({
    id: asset.id,
    name: asset.name,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    category: asset.category,
    createdAt: asset.createdAt,
    remote: useRemote,
  });
}

export async function GET(req: NextRequest) {
  return withAuthApi(
    'files GET',
    async (auth, request) => handleGet(auth, request),
    { permission: 'clients:read' },
  )(req);
}

export async function POST(req: NextRequest) {
  return withAuthApi(
    'files POST',
    async (auth, request) => handlePost(auth, request),
    { permission: 'clients:write' },
  )(req);
}
