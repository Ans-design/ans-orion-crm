#!/usr/bin/env node
/**
 * Préflight staging / Hostinger — sans déploiement.
 * Usage :
 *   npm run staging:preflight
 *   SITE_URL=https://votre-staging… npm run staging:preflight
 *
 * Étapes : typecheck léger (tsc) + health probes si SITE_URL / HOSTINGER_SITE_URL défini.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  return res.status ?? 1;
}

console.log('\n═══ Staging preflight ANS ORION ═══\n');

console.log('1/3 — tsc --noEmit…');
const tsc = run('npx', ['tsc', '--noEmit']);
if (tsc !== 0) {
  console.error('\n❌ Typecheck échoué — corriger avant staging.\n');
  process.exit(tsc);
}

console.log('\n2/3 — vitest security-headers (CSP Report-Only)…');
const vitest = run('npx', ['vitest', 'run', 'tests/security-headers.test.ts', '--reporter=dot']);
if (vitest !== 0) {
  console.error('\n❌ Tests security-headers échoués.\n');
  process.exit(vitest);
}

const site = process.env.SITE_URL || process.env.HOSTINGER_SITE_URL || '';
console.log('\n3/3 — healthcheck distant…');
if (!site) {
  console.log('  (skip) Définir SITE_URL ou HOSTINGER_SITE_URL pour sonder /api/health*.');
  console.log('  Exemple : SITE_URL=https://staging.example.com npm run staging:preflight');
  console.log('\n✅ Préflight local OK (tsc + security-headers). Health distant non exécuté.\n');
  process.exit(0);
}

// Healthcheck Hostinger est derrière le guard local — on appelle le .ts directement.
const health = run('npx', ['tsx', 'scripts/hostinger-healthcheck.ts'], {
  env: { ...process.env, SITE_URL: site, ALLOW_HOSTINGER_DEPLOY: 'true' },
});
if (health !== 0) {
  console.error('\n❌ Healthcheck distant échoué.\n');
  process.exit(health);
}

console.log('\n✅ Préflight staging complet OK\n');
process.exit(0);
