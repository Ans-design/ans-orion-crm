#!/usr/bin/env node
/**
 * Orchestrateur release ANS ORION — vérifs locales avant déploiement.
 * Usage : node scripts/release-orion.mjs [--skip-build] [--skip-e2e]
 */
import { spawnSync } from 'child_process';

const args = new Set(process.argv.slice(2));
const skipBuild = args.has('--skip-build');
const skipE2e = args.has('--skip-e2e');

const steps = [
  { name: 'Typecheck', cmd: 'npm', args: ['run', 'typecheck'] },
  { name: 'Lint', cmd: 'npm', args: ['run', 'lint'] },
  { name: 'Unit tests', cmd: 'npm', args: ['test'] },
  { name: 'API auth audit', cmd: 'npm', args: ['run', 'audit:api-auth'] },
];

if (!skipBuild) {
  steps.push({ name: 'Production build', cmd: 'npm', args: ['run', 'build'] });
}

if (!skipE2e) {
  steps.push({ name: 'Smoke E2E', cmd: 'npm', args: ['run', 'test:e2e:smoke'] });
}

function runStep({ name, cmd, args: stepArgs }) {
  console.log(`\n${'═'.repeat(60)}\n▶ ${name}\n${'═'.repeat(60)}`);
  const result = spawnSync(cmd, stepArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`\n✗ Échec : ${name} (code ${result.status ?? 1})`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${name}`);
}

console.log('ANS ORION — release-orion.mjs');
console.log(`Options : skip-build=${skipBuild}, skip-e2e=${skipE2e}`);

for (const step of steps) {
  runStep(step);
}

console.log('\n✓ Pipeline release locale terminée.');
console.log('Prochaines étapes : docs/DEPLOY_CHECKLIST.md → hostinger:redeploy:session');
