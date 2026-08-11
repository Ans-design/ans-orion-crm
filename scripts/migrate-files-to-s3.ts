/**
 * Migre les FileAsset base64 (SQLite demo) vers S3/R2.
 * Usage: npx tsx scripts/migrate-files-to-s3.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  buildStorageKey,
  isObjectStorageConfigured,
  uploadObject,
} from '../lib/storage/object-storage';

const prisma = new PrismaClient();

async function main() {
  if (!isObjectStorageConfigured()) {
    console.error('❌ S3/R2 non configuré (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).');
    process.exit(1);
  }

  const local = await prisma.fileAsset.findMany({
    where: { storageKey: null, NOT: { content: '' } },
  });

  if (!local.length) {
    console.log('✅ Aucun fichier local à migrer.');
    return;
  }

  console.log(`📦 Migration de ${local.length} fichier(s) vers S3/R2…`);

  for (const file of local) {
    const buffer = Buffer.from(file.content, 'base64');
    const storageKey = buildStorageKey({
      clientId: file.clientId,
      fileName: file.name,
      assetId: file.id,
    });
    await uploadObject(storageKey, buffer, file.mimeType);
    await prisma.fileAsset.update({
      where: { id: file.id },
      data: { storageKey, content: '' },
    });
    console.log(`  ✓ ${file.name} → ${storageKey}`);
  }

  console.log('\n✅ Migration terminée.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
