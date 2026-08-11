#!/usr/bin/env node
/**
 * Restaure formules / règles / matières POS depuis le catalogue (SQLite local).
 * Usage: npm run restore:local-pricing
 *
 * Ne remplace pas une sauvegarde manuelle custom (admin) — reconstruit depuis le code catalogue.
 */
import { spawnSync } from 'child_process';
import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { assertLocalDataOpsAllowed } from './refuse-production-data-ops.mjs';

assertLocalDataOpsAllowed('restore:local-pricing');

const cwd = process.cwd();
const absDb = join(cwd, 'prisma', 'dev.db').replace(/\\/g, '/');
const env = {
  ...process.env,
  APP_ENV: 'local',
  LOCAL_DEV: 'true',
  ANS_LOCAL_SQLITE_SEED: '1',
  USE_PRODUCTION_DB: 'false',
  DEMO_MODE: 'false',
  DATABASE_URL: `file:${absDb}`,
  DATABASE_URL_SQLITE: `file:${absDb}`,
};

function run(label, cmd, args) {
  console.log(`\n===== ${label} =====`);
  const r = spawnSync(cmd, args, { cwd, env, stdio: 'inherit', shell: true });
  if ((r.status ?? 1) !== 0) {
    console.error(`Échec: ${label}`);
    process.exit(r.status ?? 1);
  }
}

run('db push', 'node', ['scripts/run-local.mjs', 'prisma-push']);
run('base-materials', 'npm', ['run', 'seed:base-materials']);
run('dynamic-pricing', 'npm', ['run', 'seed:dynamic-pricing']);
run('regles', 'npm', ['run', 'seed:regles']);
run('pricing-rules', 'npm', ['run', 'sync:pricing-rules']);
run('publish', 'npm', ['run', 'publish:local-pricing']);

// Publier tout le reste (draft → published)
run(
  'publish-all-drafts',
  'npx',
  [
    'tsx',
    '-e',
    `import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const a = await p.articlePricingProfile.updateMany({ where: { status: 'draft', active: true }, data: { status: 'published' } });
const f = await p.formulaVersion.updateMany({ where: { status: 'draft' }, data: { status: 'published' } });
console.log('extra publish', a.count, f.count);
await p.$disconnect();`,
  ],
);

const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const backup = join(cwd, 'prisma', `dev.db.backup-restored-${stamp}`);
if (existsSync(join(cwd, 'prisma', 'dev.db'))) {
  copyFileSync(join(cwd, 'prisma', 'dev.db'), backup);
  console.log(`\n✓ Backup: ${backup}`);
}

console.log('\n✓ Restore local pricing terminé — rechargez le POS (Ctrl+Shift+R).');
