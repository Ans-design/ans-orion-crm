#!/usr/bin/env node
/** Prépare données backoffice local : sync DB + matières + pricing + publication POS. */
import { execSync } from 'child_process';
import { ensureSqliteSchema, localSqliteEnv } from './lib/sqlite-schema.mjs';

const env = localSqliteEnv();

const run = (cmd) => {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env, cwd: process.cwd() });
};

ensureSqliteSchema();
run('npx prisma generate');
run('npx prisma db push');
run('npm run seed:base-materials');
run('npm run seed:dynamic-pricing');
run('npm run publish:local-pricing');
run('node scripts/migrate-impression-sf-local.mjs all');

console.log('\n✓ Backoffice local prêt');
console.log('  npm run dev:local');
console.log('  → http://127.0.0.1:3020/pos');
console.log('  Connexion : comptes via SEED_* / DEMO_* dans .env.local (non affichés)\n');
