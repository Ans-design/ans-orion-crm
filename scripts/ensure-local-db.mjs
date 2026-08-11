#!/usr/bin/env node
/**
 * Garantit prisma/dev.db + tables avant `npm run dev`.
 * Évite P2021 (User/Employee table does not exist) en local.
 */
import { existsSync, mkdirSync, renameSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const cwd = process.cwd();
const canonicalDb = join(cwd, 'prisma', 'dev.db');
const misplacedDb = join(cwd, 'prisma', 'prisma', 'dev.db');

const databaseUrl = `file:${canonicalDb.replace(/\\/g, '/')}`;
const env = {
  ...process.env,
  APP_ENV: 'local',
  LOCAL_DEV: 'true',
  DATABASE_URL: databaseUrl,
  DATABASE_URL_SQLITE: databaseUrl,
};

/** Ancien bug : Prisma CLI créait prisma/prisma/dev.db */
function recoverMisplacedDb() {
  if (existsSync(canonicalDb) || !existsSync(misplacedDb)) return;
  mkdirSync(dirname(canonicalDb), { recursive: true });
  renameSync(misplacedDb, canonicalDb);
  console.log('[ensure-local-db] DB déplacée : prisma/prisma/dev.db → prisma/dev.db');
}

async function schemaReady() {
  if (!existsSync(canonicalDb)) return false;
  if (statSync(canonicalDb).size < 40_000) return false;
  try {
    const require = createRequire(import.meta.url);
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    try {
      const rows = await prisma.$queryRawUnsafe(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('User','Employee')",
      );
      return Array.isArray(rows) && rows.length >= 2;
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  } catch {
    return false;
  }
}

recoverMisplacedDb();

const ready = await schemaReady();
if (ready) process.exit(0);

console.log('[ensure-local-db] SQLite local incomplet → prisma db push…');
const push = spawnSync('node', ['scripts/run-local.mjs', 'prisma-push'], {
  cwd,
  env,
  stdio: 'inherit',
  shell: true,
});
process.exit(push.status ?? 1);
