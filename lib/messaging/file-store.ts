import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  isObjectStorageConfigured,
  uploadObject,
  getObject,
  buildStorageKey,
} from '@/lib/storage/object-storage';

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function localBaseDir(): string {
  return process.env.VERCEL === '1'
    ? path.join('/tmp', 'ans-talk-files')
    : path.join(process.cwd(), 'data', 'talk-files');
}

function isProdRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
}

export async function storeTalkFileBytes(
  buffer: Buffer,
  params: { attachmentId: string; originalFileName: string; clientId?: string | null; mimeType: string },
): Promise<{ storageKey: string; checksumSha256: string }> {
  const checksumSha256 = sha256Buffer(buffer);

  if (isObjectStorageConfigured()) {
    const storageKey = buildStorageKey({
      clientId: params.clientId,
      fileName: params.originalFileName,
      assetId: params.attachmentId,
    });
    await uploadObject(storageKey, buffer, params.mimeType);
    return { storageKey, checksumSha256 };
  }

  // V14 P0-23 : object storage obligatoire en production
  if (isProdRuntime()) {
    throw new Error('OBJECT_STORAGE_REQUIRED');
  }

  const safeName = params.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = path.join(localBaseDir(), params.attachmentId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, safeName);
  await fs.writeFile(filePath, buffer);
  return { storageKey: `local:${params.attachmentId}/${safeName}`, checksumSha256 };
}

export async function readTalkFileBytes(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith('local:')) {
    const rel = storageKey.slice('local:'.length);
    const filePath = path.join(localBaseDir(), rel);
    return fs.readFile(filePath);
  }
  return getObject(storageKey);
}
