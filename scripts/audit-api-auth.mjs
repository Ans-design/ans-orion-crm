#!/usr/bin/env node
/**
 * Vérifie que chaque route API importe une protection auth ou est allowlistée.
 * Usage: node scripts/audit-api-auth.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'app', 'api');

const AUTH_PATTERNS = [
  'requirePermission',
  'requireAnyPermission',
  'requireAuth',
  'requireAdmin',
  'requireAdminOrManager',
  'requireSession',
  'requireApiAccess',
  'requireMessagingAuth',
  'requireMessagingWrite',
  'requireRhAdmin',
  'requireRhPayrollWrite',
  'requireRhEmployee',
  'requireBatRead',
  'requireBatWrite',
  'withAuthApi',
  'getServerSession',
  'createDashboardSliceRoute',
  'CRON_SECRET',
  'SETUP_SECRET',
  'verifyCronSecret',
  'verifySetupSecret',
  'checkRateLimit',
];

const PUBLIC_ALLOWLIST = new Set([
  'app/api/health/route.ts',
  'app/api/health/db/route.ts',
  'app/api/health/ready/route.ts',
  'app/api/health/system/route.ts',
  'app/api/auth/login/route.ts',
  'app/api/auth/login-check/route.ts',
  'app/api/auth/login-fail/route.ts',
  'app/api/auth/login-success/route.ts',
  'app/api/auth/[...nextauth]/route.ts',
  'app/api/auth/public-info/route.ts',
  'app/api/auth/setup-status/route.ts',
  'app/api/auth/forgot-password/route.ts',
  'app/api/auth/reset-password/route.ts',
  'app/api/auth/access-request/route.ts',
  'app/api/auth/access-request/status/route.ts',
  'app/api/bat/client/[token]/route.ts',
  'app/api/bat/client/[token]/preview/route.ts',
  'app/api/setup-db/route.ts',
  'app/api/signup/route.ts',
  'app/api/dev-preview/[dataset]/route.ts',
  'app/api/cron/orion-daily/route.ts',
  'app/api/cron/devis-expiration/route.ts',
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (e.name === 'route.ts') files.push(full);
  }
  return files;
}

function relPosix(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

async function main() {
  const routes = await walk(API_DIR);
  const unprotected = [];

  for (const file of routes) {
    const rel = relPosix(file);
    if (PUBLIC_ALLOWLIST.has(rel)) continue;

    const content = await readFile(file, 'utf8');
    const hasAuth = AUTH_PATTERNS.some((p) => content.includes(p));
    const isReexportOnly = content.trim().split('\n').every((line) => {
      const t = line.trim();
      return !t || t.startsWith('export') || t.startsWith('//') || t.startsWith('/*');
    });

    if (!hasAuth && !isReexportOnly) {
      unprotected.push(rel);
    }
  }

  console.log(`\n🔐 Audit auth API — ${routes.length} routes\n`);
  if (unprotected.length === 0) {
    console.log('✅ Toutes les routes protégées ou allowlistées\n');
    process.exit(0);
  }

  console.log(`❌ ${unprotected.length} route(s) sans protection auth détectée :\n`);
  for (const r of unprotected.slice(0, 40)) {
    console.log(`  - ${r}`);
  }
  if (unprotected.length > 40) {
    console.log(`  … et ${unprotected.length - 40} autres`);
  }
  console.log('\nAjouter requirePermission/withAuthApi ou étendre PUBLIC_ALLOWLIST si intentionnel.\n');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
