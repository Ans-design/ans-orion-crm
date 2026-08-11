/**
 * Vérifie la couverture drift sync post-publication prix / catalogue.
 * Usage: npm run sync:verify-drift
 */
import 'dotenv/config';
import runVerifySyncDrift, { DriftVerifyError } from './verify-sync-drift-runner';
import { restorePostgresSchema } from './lib/postgres-prisma-patch';

async function main() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';

  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
    if (process.env.APP_ENV === 'local' || process.env.LOCAL_DEV === 'true') {
      process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
    }
  }

  await import('@/lib/init-server-env');

  await runVerifySyncDrift();
}

main().catch((e) => {
  if (e instanceof DriftVerifyError) {
    const code = e.code === 'MISSING_DATABASE_URL' ? 1 : e.code === 'DB_UNAVAILABLE' ? 2 : 1;
    process.exit(code);
  }
  console.error(e);
  restorePostgresSchema();
  process.exit(1);
});
