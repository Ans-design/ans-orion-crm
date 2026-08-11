import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

let s3: S3Client | null = null;

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET
    && process.env.S3_ACCESS_KEY_ID
    && process.env.S3_SECRET_ACCESS_KEY,
  );
}

function getClient(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }
  return s3;
}

function bucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error('S3_BUCKET non configuré');
  return b;
}

export function buildStorageKey(params: {
  clientId?: string | null;
  fileName: string;
  assetId: string;
}): string {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const prefix = params.clientId ? `clients/${params.clientId}` : 'uploads';
  return `${prefix}/${params.assetId}/${safeName}`;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function getObject(key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  }));
  if (!res.Body) throw new Error('Objet vide');
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({
    Bucket: bucket(),
    Key: key,
  }));
}

export function maxUploadBytes(): number {
  return isObjectStorageConfigured()
    ? Number(process.env.S3_MAX_BYTES || 15 * 1024 * 1024)
    : 2 * 1024 * 1024;
}
