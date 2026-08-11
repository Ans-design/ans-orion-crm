#!/usr/bin/env node
/**
 * Synchronise la base SQLite locale (prisma/dev.db) avec schema.prisma.
 * Usage : npm run db:sync
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ensureSqliteSchema, localSqliteEnv } from './lib/sqlite-schema.mjs';

const env = localSqliteEnv();

const run = (cmd) => {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env, cwd: process.cwd() });
};

if (!fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  console.warn('⚠ .env.local absent — copiez .env.local.example');
}

try {
  ensureSqliteSchema();
  run('npx prisma validate');
  run('npx prisma generate');
} catch {
  console.warn('⚠ prisma generate bloqué (serveur dev actif ?) — suite avec db push');
}

try {
  run('npx prisma db push');
} catch {
  console.warn('Échec db push — arrêtez tous les processus node puis relancez npm run db:sync');
  process.exit(1);
}

console.log('\n✓ Base locale synchronisée :', env.DATABASE_URL);
