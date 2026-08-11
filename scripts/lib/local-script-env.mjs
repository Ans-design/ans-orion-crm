/**
 * Bootstrap env pour scripts CLI en dev local (SQLite, pas Postgres vide).
 */
export function bootstrapLocalScriptEnv() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';

  const url = process.env.DATABASE_URL?.trim() ?? '';
  if (!url.startsWith('file:')) {
    if (process.env.APP_ENV === 'local' || process.env.LOCAL_DEV === 'true') {
      process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
    }
  }
}
