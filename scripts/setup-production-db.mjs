/**
 * Initialise PostgreSQL production (Neon / Vercel Postgres).
 * Patche temporairement schema.prisma → push → seed complet → restaure SQLite.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run db:prod-setup
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const url = process.env.DATABASE_URL;
if (!url?.startsWith('postgres')) {
  console.error('❌ DATABASE_URL PostgreSQL requis (ex. Neon).');
  console.error('   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" npm run db:prod-setup');
  process.exit(1);
}

if (process.env.ALLOW_PROD_DB_SETUP !== 'true') {
  console.error('❌ Refusé : db:prod-setup peut écraser des données (db push --accept-data-loss).');
  console.error('   Prérequis : backup PG restaurable + ALLOW_PROD_DB_SETUP=true');
  console.error('   Préférer : npm run db:migrate:deploy / db:migrate:neon');
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const schemaBackup = fs.readFileSync(schemaPath, 'utf8');

function patchPostgres() {
  if (schemaBackup.includes('provider = "sqlite"')) {
    fs.writeFileSync(
      schemaPath,
      schemaBackup.replace('provider = "sqlite"', 'provider = "postgresql"'),
    );
    console.log('✓ Schema → PostgreSQL (temporaire)');
  }
}

function restoreSchema() {
  fs.writeFileSync(schemaPath, schemaBackup);
  console.log('✓ Schema SQLite restauré pour dev local');
}

function run(cmd, extraEnv = {}) {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, USE_PRODUCTION_DB: 'true', ...extraEnv },
  });
}

try {
  patchPostgres();
  run('npx prisma generate');
  run('npx prisma db push --accept-data-loss');
  run('npm run seed');
  try {
    run('npm run seed:demo');
  } catch {
    console.log('ℹ seed:demo ignoré (compte démo déjà dans seed principal)');
  }
  try {
    run('npx tsx --require dotenv/config scripts/seed-stock-runner.ts');
  } catch (e) {
    console.log('ℹ seed-stock-runner ignoré:', String(e).slice(0, 80));
  }
  try {
    run('npx tsx --require dotenv/config scripts/seed-phase3-runner.ts');
  } catch (e) {
    console.log('ℹ seed-phase3 ignoré:', String(e).slice(0, 80));
  }
  try {
    run('npx tsx --require dotenv/config scripts/seed-phase4-runner.ts');
  } catch (e) {
    console.log('ℹ seed-phase4 ignoré:', String(e).slice(0, 80));
  }
  try {
    run('npm run seed:regles');
  } catch {
    console.log('ℹ seed:regles ignoré (fallback catalogue OK)');
  }
  console.log('\n✅ Base PostgreSQL production prête.');
  console.log('   Comptes : définis via ADMIN_EMAIL / SEED_* / ORION_SEED_BOOTSTRAP_SECRET (jamais loggés).');
  console.log('\n⚙ Vercel production :');
  console.log('   1. Retirer DEMO_MODE ou DEMO_MODE=false');
  console.log('   2. DATABASE_URL = URL Neon');
  console.log('   3. NEXTAUTH_URL = URL canonique');
  console.log('   4. Redéployer (vercel-build applique db push auto si postgres)');
} finally {
  restoreSchema();
  run('npx prisma generate');
}
