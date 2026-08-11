import { prisma } from '@/lib/prisma';
import {
  buildStorageKey,
  isObjectStorageConfigured,
  uploadObject,
} from '@/lib/storage/object-storage';
import {
  buildPlaceholderSvg,
  fileExtension,
  isNativePreviewable,
  needsAsyncPreview,
} from '@/lib/file-preview/preview-utils';

const PREVIEW_MIME = 'image/svg+xml';

function buildPreviewStorageKey(assetId: string): string {
  return `previews/${assetId}/thumb.svg`;
}

/** Initialise le statut preview après upload et lance la génération async si nécessaire. */
export function scheduleFilePreview(assetId: string): void {
  void initAndGeneratePreview(assetId).catch((err) => {
    console.error('[file-preview] schedule failed', assetId, err);
  });
}

async function initAndGeneratePreview(assetId: string): Promise<void> {
  const file = await prisma.fileAsset.findUnique({ where: { id: assetId } });
  if (!file) return;

  if (isNativePreviewable(file.name, file.mimeType)) {
    await prisma.fileAsset.update({
      where: { id: assetId },
      data: { previewStatus: 'native', previewMimeType: file.mimeType },
    });
    return;
  }

  if (!needsAsyncPreview(file.name)) {
    await prisma.fileAsset.update({
      where: { id: assetId },
      data: { previewStatus: 'failed', previewMimeType: null },
    });
    return;
  }

  await prisma.fileAsset.update({
    where: { id: assetId },
    data: { previewStatus: 'pending', previewMimeType: PREVIEW_MIME },
  });

  await generateFilePreview(assetId);
}

/** Génère un aperçu placeholder pour AI / PSD / CDR / EPS. */
export async function generateFilePreview(assetId: string): Promise<void> {
  const file = await prisma.fileAsset.findUnique({ where: { id: assetId } });
  if (!file) return;

  try {
    const ext = fileExtension(file.name);
    const svg = buildPlaceholderSvg({ name: file.name, ext, sizeBytes: file.sizeBytes });
    const buffer = Buffer.from(svg, 'utf-8');
    const useRemote = isObjectStorageConfigured();

    if (useRemote) {
      const previewKey = buildPreviewStorageKey(assetId);
      await uploadObject(previewKey, buffer, PREVIEW_MIME);
      await prisma.fileAsset.update({
        where: { id: assetId },
        data: {
          previewKey,
          previewContent: '',
          previewStatus: 'ready',
          previewMimeType: PREVIEW_MIME,
        },
      });
    } else {
      await prisma.fileAsset.update({
        where: { id: assetId },
        data: {
          previewContent: buffer.toString('base64'),
          previewKey: null,
          previewStatus: 'ready',
          previewMimeType: PREVIEW_MIME,
        },
      });
    }
  } catch (err) {
    console.error('[file-preview] generate failed', assetId, err);
    await prisma.fileAsset.update({
      where: { id: assetId },
      data: { previewStatus: 'failed' },
    });
  }
}

export async function getPreviewBuffer(assetId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  status: string;
} | null> {
  const file = await prisma.fileAsset.findUnique({ where: { id: assetId } });
  if (!file) return null;

  if (file.previewStatus === 'native') {
    const { getObject } = await import('@/lib/storage/object-storage');
    const buffer = file.storageKey
      ? await getObject(file.storageKey)
      : Buffer.from(file.content, 'base64');
    return { buffer, mimeType: file.mimeType, status: 'native' };
  }

  if (file.previewStatus === 'ready') {
    if (file.previewKey) {
      const { getObject } = await import('@/lib/storage/object-storage');
      const buffer = await getObject(file.previewKey);
      return { buffer, mimeType: file.previewMimeType ?? PREVIEW_MIME, status: 'ready' };
    }
    if (file.previewContent) {
      return {
        buffer: Buffer.from(file.previewContent, 'base64'),
        mimeType: file.previewMimeType ?? PREVIEW_MIME,
        status: 'ready',
      };
    }
  }

  if (file.previewStatus === 'pending' || file.previewStatus === 'none') {
    if (needsAsyncPreview(file.name)) {
      scheduleFilePreview(assetId);
    }
    return { buffer: Buffer.alloc(0), mimeType: PREVIEW_MIME, status: 'pending' };
  }

  return null;
}
