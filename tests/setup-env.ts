/**
 * Vitest bootstrap — force SQLite local avant tout import Prisma.
 * NODE_ENV=test n'active pas isLocalAppEnv() ; sans ça, bundled env
 * peut injecter postgresql:// alors que schema.prisma = sqlite (file:).
 */
import { resolveDatabaseUrl } from '@/lib/database-url';

if (!process.env.APP_ENV?.trim()) {
  process.env.APP_ENV = 'local';
}
if (!process.env.LOCAL_DEV?.trim()) {
  process.env.LOCAL_DEV = 'true';
}
// Vitest ne doit pas hériter d’un NODE_ENV=production du shell (`next start` E2E)
if (process.env.NODE_ENV === 'production' && (process.env.APP_ENV || '').toLowerCase() === 'local') {
  (process.env as { NODE_ENV?: string }).NODE_ENV = 'test';
}

const current = process.env.DATABASE_URL?.trim() ?? '';
if (!current.startsWith('file:')) {
  process.env.DATABASE_URL = (
    process.env.DATABASE_URL_SQLITE?.trim() || 'file:./prisma/dev.db'
  );
}

resolveDatabaseUrl();
