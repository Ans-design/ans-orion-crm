/**
 * Build production Hostinger — PostgreSQL obligatoire.
 * Usage : USE_PRODUCTION_DB=true DATABASE_URL=postgres… npm run build
 *
 * Ne lance PAS `prisma db push` ni migrate ici (risque data-loss).
 * Schéma appliqué uniquement via procédure validée + backup (voir docs).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const schemaBackup = fs.readFileSync(schemaPath, 'utf8');

function loadBundledDbEnv() {
  if (process.env.DATABASE_URL?.startsWith('postgres')) return;
  for (const file of ['.env.vercel.production', 'deploy/hostinger/orion.env']) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
      const m = line.match(/^(POSTGRES_PRISMA_URL|POSTGRES_URL|DATABASE_URL)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim().replace(/^["']|["']$/g, '');
      if (val.startsWith('postgres')) {
        process.env.DATABASE_URL = val;
        return;
      }
    }
  }
}

loadBundledDbEnv();

if (!process.env.DATABASE_URL?.startsWith('postgres')) {
  console.error('ERREUR: DATABASE_URL PostgreSQL requis sur Hostinger (Neon ou Postgres local).');
  process.exit(1);
}

if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
  console.error('ERREUR: NEXTAUTH_SECRET (32+ caractères) requis.');
  process.exit(1);
}

process.env.USE_PRODUCTION_DB = 'true';
process.env.AUTH_TRUST_HOST = 'true';
process.env.HOSTINGER = 'true';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

const patched = schemaBackup.replace('provider = "sqlite"', 'provider = "postgresql"');
fs.writeFileSync(schemaPath, patched);
console.log('Schema Prisma → PostgreSQL (Hostinger).');

try {
  run('npx prisma generate');
  // PAS de db push / migrate ici — schéma DB géré hors build (backup + validation propriétaire)
  run('npx next build');
} finally {
  fs.writeFileSync(schemaPath, schemaBackup);
  console.log('Schema SQLite restauré (repo source).');
}
