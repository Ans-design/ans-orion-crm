export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBatWrite } from '@/lib/server/auth/bat-access';
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
import { isAllowedProExtension, FILE_VERSION_LABELS } from '@/lib/constants/file-assets';
import { syncGpaoOnFileUploaded } from '@/lib/services/bat-gpao-sync';
import { scheduleFilePreview } from '@/lib/services/file-preview-service';

/** Upload fichier + création version BAT en une étape */
export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireBatWrite();
  if ('error' in auth) return auth.error;

  try {
    const proof = await prisma.proof.findUnique({
      where: { id: id },
      include: { commande: { select: { id: true, clientId: true } } },
    });
    if (!proof) return apiError('BAT introuvable', 404);
    if (proof.locked) return apiError('BAT verrouillé — nouvelle version impossible', 403);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const versionLabel = String(form.get('versionLabel') || 'v1');
    const notes = String(form.get('notes') || '') || null;

    if (!file) return apiError('Fichier requis', 400);
    if (!isAllowedProExtension(file.name)) {
      return apiError('Extension non autorisée', 400);
    }
    if (!FILE_VERSION_LABELS.includes(versionLabel as typeof FILE_VERSION_LABELS[number])) {
      return apiError('Libellé de version invalide', 400);
    }

    const maxBytes = maxUploadBytes();
    if (file.size > maxBytes) {
      return apiError(`Fichier trop volumineux (max ${Math.round(maxBytes / (1024 * 1024))} Mo)`, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    const useRemote = isObjectStorageConfigured();
    const commandeId = proof.commandeId;

    const asset = await prisma.fileAsset.create({
      data: {
        commandeId,
        clientId: proof.clientId ?? proof.commande?.clientId ?? null,
        proofId: proof.id,
        name: file.name,
        mimeType,
        sizeBytes: file.size,
        category: 'bat',
        versionLabel,
        statut: 'En vérification',
        content: useRemote ? '' : buffer.toString('base64'),
        uploadedBy: auth.userName,
      },
    });

    if (useRemote) {
      const storageKey = buildStorageKey({
        clientId: proof.clientId,
        fileName: file.name,
        assetId: asset.id,
      });
      await uploadObject(storageKey, buffer, mimeType);
      await prisma.fileAsset.update({ where: { id: asset.id }, data: { storageKey } });
    }

    const version = await prisma.proofVersion.create({
      data: {
        proofId: proof.id,
        versionLabel,
        statut: 'Envoyé',
        notes,
        fileAssetId: asset.id,
        createdBy: auth.userName,
      },
    });

    const nextStatut =
      proof.statut === 'En attente fichier' || proof.statut === 'En attente'
        ? 'En attente validation client'
        : proof.statut === 'Correction demandée'
          ? 'En attente validation client'
          : proof.statut;

    await prisma.proof.update({
      where: { id: proof.id },
      data: {
        fileAssetId: asset.id,
        statut: nextStatut,
        sentAt: new Date(),
      },
    });

    if (commandeId) await syncGpaoOnFileUploaded(commandeId);
    scheduleFilePreview(asset.id);

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'BAT_VERSION_UPLOAD',
      entity: 'Proof',
      entityId: proof.id,
      entityLabel: proof.numero,
      details: { versionLabel, fileAssetId: asset.id },
    });

    return created({ version, fileAsset: { id: asset.id, name: asset.name, mimeType: asset.mimeType } });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur upload version BAT'), 500);
  }
}
