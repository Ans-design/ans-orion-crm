#!/usr/bin/env node
/** Installe dépendances npm, client Prisma et navigateur Playwright. */
import { execSync } from 'child_process';

const run = (cmd) => {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
};

console.log('Mode local actif : aucun déploiement Hostinger ne sera effectué.');

run('npm install');
run('npm run db:generate');
run('npx playwright install chromium');
console.log('\n✓ Environnement dev prêt');
console.log('  npm run dev              → http://localhost:3000');
console.log('  npm run setup:local      → SQLite + seed');
console.log('  npm run preview:local    → /dev-preview');
console.log('  Voir README_LOCAL.md\n');
