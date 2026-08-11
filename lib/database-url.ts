/** Résout DATABASE_URL depuis les variables Neon/Vercel (POSTGRES_*). */
import path from 'path';
import { normalizePostgresUrl, pickPostgresUrl } from '@/lib/postgres-url';
import { isLocalAppEnv } from '@/lib/local-dev';

/**
 * SQLite : chemin absolu unique pour CLI Prisma (relatif au schema)
 * et PrismaClient runtime (relatif au cwd) — évite prisma/prisma/dev.db vs prisma/dev.db.
 */
export function resolveLocalSqliteFileUrl(raw?: string | null): string {
  const fallbackRel = './prisma/dev.db';
  let input = (raw?.trim() || fallbackRel);
  if (input.startsWith('file:')) input = input.slice('file:'.length);

  // file:///C:/... → C:/...
  if (/^\/\/\/[A-Za-z]:/.test(input)) input = input.slice(3);
  else if (input.startsWith('///')) input = input.slice(2);
  else if (input.startsWith('//') && !input.startsWith('//./')) input = input.slice(1);

  const normalized = input.replace(/\\/g, '/');
  const basename = normalized.replace(/^\.\//, '');

  let abs: string;
  if (path.isAbsolute(input) || /^[A-Za-z]:[\\/]/.test(input)) {
    abs = path.resolve(input);
  } else if (
    basename === 'dev.db'
    || basename === 'prisma/dev.db'
    || basename.endsWith('/prisma/dev.db')
    || basename === 'prisma/prisma/dev.db'
  ) {
    // Canonique : toujours <cwd>/prisma/dev.db
    abs = path.join(process.cwd(), 'prisma', 'dev.db');
  } else if (
    basename === 'e2e.db'
    || basename === 'prisma/e2e.db'
    || basename.endsWith('/prisma/e2e.db')
    || basename === 'prisma/prisma/e2e.db'
  ) {
    // Canonique : toujours <cwd>/prisma/e2e.db (évite prisma/prisma/e2e.db via CLI)
    abs = path.join(process.cwd(), 'prisma', 'e2e.db');
  } else {
    abs = path.resolve(process.cwd(), input);
  }

  return `file:${abs.replace(/\\/g, '/')}`;
}

export function resolveDatabaseUrl(): string | undefined {
  const isDev = process.env.NODE_ENV === 'development';
  const useNeonLocal = process.env.USE_NEON_LOCAL === 'true';
  const localMode = isLocalAppEnv() || process.env.LOCAL_DEV === 'true';

  // Vercel sans opt-in Neon : démo SQLite (évite erreur postgresql:// sans permission env)
  if (process.env.VERCEL && process.env.USE_PRODUCTION_DB !== 'true') {
    process.env.DEMO_MODE = 'true';
    return undefined;
  }

  // Dev local : SQLite uniquement (jamais Postgres Neon sauf opt-in)
  const currentBeforeOverride = process.env.DATABASE_URL?.trim();
  const forcePostgres =
    !localMode &&
    (process.env.USE_PRODUCTION_DB === 'true' || currentBeforeOverride?.startsWith('postgres'));

  if ((isDev || localMode) && !useNeonLocal && !process.env.VERCEL && !forcePostgres) {
    const sqliteUrl = resolveLocalSqliteFileUrl(
      currentBeforeOverride?.startsWith('file:')
        ? currentBeforeOverride
        : (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db'),
    );
    process.env.DATABASE_URL = sqliteUrl;
    return sqliteUrl;
  }

  const current = process.env.DATABASE_URL?.trim();
  if (process.env.USE_PRODUCTION_DB === 'true' && current?.startsWith('file:')) {
    const postgres = pickPostgresUrl({
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
      POSTGRES_URL: process.env.POSTGRES_URL,
    });
    if (postgres) {
      process.env.DATABASE_URL = postgres;
      return process.env.DATABASE_URL;
    }
  }

  if (current?.startsWith('postgres')) {
    process.env.DATABASE_URL = normalizePostgresUrl(current);
    return process.env.DATABASE_URL;
  }

  if (current?.startsWith('file:')) {
    const abs = resolveLocalSqliteFileUrl(current);
    process.env.DATABASE_URL = abs;
    return abs;
  }

  const fallback = pickPostgresUrl({
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
  });

  if (fallback) {
    process.env.DATABASE_URL = fallback;
    return process.env.DATABASE_URL;
  }

  return current || undefined;
}

export function isPostgresDatabase(): boolean {
  resolveDatabaseUrl();
  return Boolean(process.env.DATABASE_URL?.startsWith('postgres'));
}
