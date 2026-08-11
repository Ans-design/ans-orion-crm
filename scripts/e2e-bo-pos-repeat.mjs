#!/usr/bin/env node
/**
 * Relance le pack E2E BO→POS N fois pour détecter les flakes.
 * Usage: node scripts/e2e-bo-pos-repeat.mjs [runs=3]
 */
import { spawnSync } from 'node:child_process';

const runs = Math.max(1, Number(process.argv[2] || 3));
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

let failed = 0;
for (let i = 1; i <= runs; i++) {
  console.log(`\n═══ E2E BO→POS run ${i}/${runs} ═══`);
  const r = spawnSync('npx', args, { stdio: 'inherit', shell: true, env: process.env });
  if (r.status !== 0) {
    failed += 1;
    console.error(`Run ${i} FAILED (exit ${r.status})`);
  } else {
    console.log(`Run ${i} OK`);
  }
}

console.log(`\nRésultat : ${runs - failed}/${runs} OK, ${failed} échec(s)`);
process.exit(failed ? 1 : 0);
