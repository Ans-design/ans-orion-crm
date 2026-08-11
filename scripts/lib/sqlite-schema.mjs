#!/usr/bin/env node
/** Bascule schema.prisma vers sqlite pour dev local (file: DATABASE_URL). */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export function ensureSqliteSchema() {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  let content = readFileSync(schemaPath, 'utf8');
  if (content.includes('provider = "postgresql"')) {
    content = content.replace('provider = "postgresql"', 'provider = "sqlite"');
    writeFileSync(schemaPath, content);
    console.log('Schema Prisma → sqlite (dev local)');
    return true;
  }
  return false;
}

export function localSqliteEnv() {
  const databaseUrl = process.env.DATABASE_URL?.startsWith('file:')
    ? process.env.DATABASE_URL
    : (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db');
  return {
    ...process.env,
    APP_ENV: 'local',
    LOCAL_DEV: 'true',
    DISABLE_HOSTINGER_DEPLOY: 'true',
    DATABASE_URL: databaseUrl,
    USE_PRODUCTION_DB: 'false',
    DEMO_MODE: 'true',
    ANS_LOCAL_SQLITE_SEED: '1',
  };
}
