/**
 * Seed production complet ANS ORION — Neon PostgreSQL.
 * Usage: DATABASE_URL="postgresql://..." ORION_SEED_BOOTSTRAP_SECRET="…" npm run seed:production
 *
 * SEC-01 : aucun mot de passe n’est affiché. Le secret bootstrap doit être fourni
 * via variable d’environnement (min. 32 caractères) — jamais hardcodé.
 */
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

if (!process.env.DATABASE_URL?.startsWith('postgres')) {
  console.error('❌ DATABASE_URL PostgreSQL requis');
  process.exit(1);
}

const bootstrap = process.env.ORION_SEED_BOOTSTRAP_SECRET?.trim() || '';
if (bootstrap.length < 32) {
  const suggested = randomBytes(24).toString('base64url');
  console.error('❌ ORION_SEED_BOOTSTRAP_SECRET requis (min. 32 caractères).');
  console.error('   Exemple généré (à stocker dans un vault, ne pas committer) :');
  console.error(`   ORION_SEED_BOOTSTRAP_SECRET=${suggested}`);
  process.exit(1);
}

process.env.USE_PRODUCTION_DB = 'true';
process.env.ORION_SEED_BOOTSTRAP_SECRET = bootstrap;

function run(cmd: string) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

console.log('═══ ANS ORION — seed production ═══\n');

run('npm run db:prod-setup');

console.log('\n✅ Seed production terminé.');
console.log('   Comptes : définis via ORION_SEED_BOOTSTRAP_SECRET / scripts seed (jamais loggés).');
console.log('   Vérif : npm run verify:production');
