#!/usr/bin/env node
/**
 * Installation environnement LOCAL — SQLite, seed, sans Hostinger.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const run = (cmd) => {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd(), env: process.env });
};

const localExample = path.join(process.cwd(), '.env.local.example');
const localEnv = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(localEnv) && fs.existsSync(localExample)) {
  fs.copyFileSync(localExample, localEnv);
  console.log('✓ .env.local créé depuis .env.local.example — éditez NEXTAUTH_SECRET avant prod.');
}

process.env.APP_ENV = 'local';
process.env.LOCAL_DEV = 'true';

run('npm install');
run('npm run db:generate');
run('npx prisma db push --skip-generate');
run('node scripts/ensure-v29-local-passwords.mjs');
run('npm run seed');
run('npx tsx scripts/seed-v29-local.ts');
run('npx playwright install chromium');

console.log('\n✓ Environnement LOCAL prêt');
console.log('  npm run dev:local');
console.log('  Ouvrir http://127.0.0.1:3020 dans le navigateur');
console.log('  npm run db:sync     # après changement schema.prisma');
console.log('  npm run smoke:client');
console.log('  Mode local actif : aucun déploiement Hostinger ne sera effectué.\n');
