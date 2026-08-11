/**
 * Synchronise les tarifs POS depuis l'import fusion Excel ou regles catalogue.
 * Usage: DATABASE_URL=postgresql://... npm run sync:pos-prices
 */
import { execSync } from 'child_process';

if (!process.env.DATABASE_URL?.startsWith('postgres')) {
  console.error('❌ DATABASE_URL PostgreSQL requis');
  process.exit(1);
}

console.log('═══ Sync POS prix ═══\n');

try {
  execSync('npx tsx --require dotenv/config scripts/import-fusion-excel.ts', {
    stdio: 'inherit',
    env: process.env,
  });
} catch {
  console.log('ℹ Import Excel ignoré — tentative seed:regles');
  try {
    execSync('npm run seed:regles', { stdio: 'inherit', env: process.env });
  } catch (e) {
    console.error('❌ Sync prix échouée');
    process.exit(1);
  }
}

console.log('\n✅ Sync POS prix terminée');
