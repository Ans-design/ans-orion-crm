import { execSync } from 'child_process';

if (process.env.ALLOW_HOSTINGER_DEPLOY !== 'true' && process.env.FORCE_E2E_PROD !== 'true') {
  console.error('\n⚠️  test:e2e:prod cible Hostinger (production).');
  console.error('   Pendant le développement local, utilisez : npm run test:e2e');
  console.error('   Pour forcer prod : FORCE_E2E_PROD=true npm run test:e2e:prod\n');
  process.exit(1);
}

process.env.E2E_REMOTE = 'true';
process.env.E2E_SKIP_SERVER = '1';
process.env.PLAYWRIGHT_CHANNEL = process.env.PLAYWRIGHT_CHANNEL || 'msedge';
process.env.E2E_BASE_URL =
  process.env.E2E_BASE_URL || 'https://darkorchid-badger-644294.hostingersite.com';

execSync(
  'npx playwright test e2e/prod-smoke.spec.ts e2e/backoffice-messaging.spec.ts e2e/rh-finance-gpao.spec.ts --reporter=list',
  { stdio: 'inherit', env: process.env },
);
