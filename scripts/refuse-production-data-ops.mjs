#!/usr/bin/env node
/**
 * Garde non destructive : refuse les scripts data sur production / Neon.
 * Usage: import ou `node scripts/refuse-production-data-ops.mjs`
 */
export function assertLocalDataOpsAllowed(label = 'data-op') {
  const url = (process.env.DATABASE_URL || '').trim();
  const useProd = process.env.USE_PRODUCTION_DB === 'true';
  const appEnv = process.env.APP_ENV || '';
  const local = process.env.LOCAL_DEV === 'true' || appEnv === 'local';

  if (useProd || url.startsWith('postgres')) {
    console.error(
      `[${label}] REFUSÉ : opération données interdite sur PostgreSQL / production.\n` +
        `  Définissez APP_ENV=local + DATABASE_URL file:… et USE_PRODUCTION_DB≠true.`,
    );
    process.exit(1);
  }

  if (!local && !url.startsWith('file:')) {
    console.error(`[${label}] REFUSÉ : environnement non local et URL non-SQLite.`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('refuse-production-data-ops.mjs')) {
  assertLocalDataOpsAllowed('guard');
  console.log('OK — ops données locales autorisées');
}
