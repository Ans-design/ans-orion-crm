#!/usr/bin/env node
/**
 * Pack E2E Backoffice → POS (serveur frais forcé).
 * Usage: node scripts/e2e-bo-pos-run.mjs [--repeat N]
 */
import { spawnSync } from 'node:child_process';

const repeatIdx = process.argv.indexOf('--repeat');
const runs = repeatIdx >= 0 ? Math.max(1, Number(process.argv[repeatIdx + 1] || 1)) : 1;

const args = [
  'playwright',
  'test',
  'e2e/backoffice-pos-pricing-evidence.spec.ts',
  'e2e/backoffice-pos-pricing-negative.spec.ts',
  'e2e/backoffice-pos-margin-auth.spec.ts',
  'e2e/backoffice-pos-responsive.spec.ts',
  '--project=chromium',
  '--retries=0',
];

const env = {
  ...process.env,
  E2E_FORCE_FRESH_SERVER: '1',
};

let failed = 0;
for (let i = 1; i <= runs; i++) {
  if (runs > 1) console.log(`\n═══ E2E BO→POS run ${i}/${runs} ═══`);
  const r = spawnSync('npx', args, { stdio: 'inherit', shell: true, env });
  if (r.status !== 0) {
    failed += 1;
    console.error(`Run ${i} FAILED (exit ${r.status})`);
  } else if (runs > 1) {
    console.log(`Run ${i} OK`);
  }
}

if (runs > 1) {
  console.log(`\nRésultat : ${runs - failed}/${runs} OK, ${failed} échec(s)`);
}
process.exit(failed ? 1 : 0);
