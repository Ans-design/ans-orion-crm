#!/usr/bin/env node
/**
 * Applique les migrations Prisma sur PostgreSQL (Neon / Supabase / Vercel).
 * Patche temporairement schema.prisma en postgresql puis restaure SQLite.
 *
 * Usage :
 *   npm run db:migrate:deploy
 *   node scripts/db-migrate-postgres.mjs --env .env.vercel.production
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const envFileArg = process.argv.indexOf('--env');
if (envFileArg >= 0) {
  const file = process.argv[envFileArg + 1];
  if (file && fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val) process.env[m[1]] = val;
    }
    console.log(`Env chargé : ${file}`);
  }
}

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const backup = fs.readFileSync(schemaPath, 'utf8');

function pickDatabaseUrl() {
  for (const key of [
    'DATABASE_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
  ]) {
    const url = process.env[key]?.trim();
    if (url?.startsWith('postgres')) return url;
  }
  return null;
}

const dbUrl = pickDatabaseUrl();
if (!dbUrl) {
  console.error('DATABASE_URL PostgreSQL introuvable. Définissez DATABASE_URL ou POSTGRES_PRISMA_URL.');
  process.exit(1);
}

const run = (cmd, extraEnv = {}) => {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl, ...extraEnv },
    cwd: process.cwd(),
  });
};

try {
  const patched = backup.replace('provider = "sqlite"', 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, patched);
  console.log('Schema → postgresql (temporaire)');
  run('npx prisma generate');
  try {
    run('npx prisma migrate deploy');
  } catch {
    console.warn('migrate deploy a échoué — repli db push');
    run('npx prisma db push');
  }
  console.log('\n✓ Migrations Postgres appliquées');
} finally {
  fs.writeFileSync(schemaPath, backup);
  console.log('Schema SQLite restauré');
  try {
    run('npx prisma generate');
  } catch {
    console.warn('prisma generate ignoré (arrêtez le serveur dev si EPERM)');
  }
}
