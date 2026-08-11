#!/usr/bin/env node
/**
 * Bloque tout déploiement Hostinger en développement local.
 * Pour forcer (release stable uniquement) : ALLOW_HOSTINGER_DEPLOY=true npm run hostinger:deploy
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOCAL_BANNER =
  'Mode local actif : aucun déploiement Hostinger ne sera effectué.';

function loadDotEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

function isLocalMode() {
  loadDotEnv();
  if (process.env.ALLOW_HOSTINGER_DEPLOY === 'true') return false;
  const appEnv = (process.env.APP_ENV || '').toLowerCase();
  if (appEnv === 'local' || appEnv === 'development') return true;
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.LOCAL_DEV === 'true') return true;
  const url = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (/localhost|127\.0\.0\.1/i.test(url)) return true;
  return false;
}

const target = process.argv[2];

if (!target || target === '--blocked-only') {
  console.error(`\n⛔ Déploiement Hostinger désactivé pendant le développement local.`);
  console.error(`   ${LOCAL_BANNER}`);
  console.error(`\n   Pour une release stable : ALLOW_HOSTINGER_DEPLOY=true npm run hostinger:deploy\n`);
  process.exit(1);
}

if (isLocalMode()) {
  console.error(`\n⛔ Déploiement Hostinger bloqué (mode local).`);
  console.error(`   ${LOCAL_BANNER}`);
  console.error(`   Script demandé : ${target}`);
  console.error(`\n   Développez avec : npm run dev`);
  console.error(`   Aperçu modules  : http://localhost:3000/dev-preview`);
  console.error(`\n   Release stable  : ALLOW_HOSTINGER_DEPLOY=true npm run ${process.env.npm_lifecycle_event || `hostinger:${target}`}\n`);
  process.exit(1);
}

const scriptMap = {
  orchestrate: 'hostinger-orchestrate.mjs',
  hpanel: 'hostinger-hpanel-deploy.mjs',
  redeploy: 'hostinger-redeploy.mjs',
  'redeploy-api': 'hostinger-api-redeploy.mjs',
  'redeploy-git': 'hostinger-git-webhook-redeploy.mjs',
  'auto-deploy': 'hostinger-auto-deploy.mjs',
  'redeploy-cdp': 'hostinger-redeploy-cdp.mjs',
  'redeploy-session': 'hostinger-redeploy-session.mjs',
  unlock: 'hostinger-unlock.mjs',
  'wait-deploy': 'hostinger-wait-deploy.mjs',
  webhook: 'hostinger-extract-webhook.mjs',
  healthcheck: 'hostinger-healthcheck.ts',
  package: 'hostinger-package.mjs',
};

const file = scriptMap[target] || (target.endsWith('.mjs') || target.endsWith('.ts') ? target : `${target}.mjs`);
const scriptPath = path.join(process.cwd(), 'scripts', file);

if (!fs.existsSync(scriptPath)) {
  console.error(`Script introuvable : ${scriptPath}`);
  process.exit(1);
}

const runner = file.endsWith('.ts') ? 'tsx' : 'node';
const res = spawnSync(runner, [scriptPath, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
process.exit(res.status ?? 1);
