/**
 * Redéploiement Hostinger — essaie toutes les voies sans interaction.
 * 1. Webhook Git (deploy/hostinger/.git-webhook-url)
 * 2. API token (deploy/hostinger/.api-token)
 * 3. Playwright hPanel (HOSTINGER_EMAIL + HOSTINGER_PASSWORD)
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const has = (f) => fs.existsSync(path.join(root, 'deploy', 'hostinger', f));

async function tryWebhook() {
  if (!has('.git-webhook-url') && !process.env.HOSTINGER_GIT_WEBHOOK_URL) return false;
  console.log('\n═══ 1/3 Webhook Git ═══');
  execSync('node scripts/hostinger-git-webhook-redeploy.mjs', { stdio: 'inherit' });
  return true;
}

async function tryApi() {
  if (!has('.api-token') && !process.env.HOSTINGER_API_TOKEN) return false;
  console.log('\n═══ 2/3 API from-archive ═══');
  execSync('node scripts/hostinger-api-redeploy.mjs', { stdio: 'inherit' });
  return true;
}

async function tryPlaywright() {
  if (!process.env.HOSTINGER_EMAIL || !process.env.HOSTINGER_PASSWORD) return false;
  console.log('\n═══ 3/4 Playwright hPanel ═══');
  try {
    execSync('node scripts/hostinger-redeploy.mjs', { stdio: 'inherit', env: process.env });
    return true;
  } catch {
    console.warn('Playwright bloqué (Cloudflare)');
    return false;
  }
}

async function tryCdp() {
  if (!process.env.HOSTINGER_EMAIL || !process.env.HOSTINGER_PASSWORD) return false;
  console.log('\n═══ 4/4 Chrome CDP hPanel ═══');
  execSync('node scripts/hostinger-unlock.mjs', { stdio: 'inherit', env: process.env });
  return true;
}

async function main() {
  console.log('→ Package ZIP…');
  execSync('node scripts/hostinger-package.mjs', { stdio: 'inherit' });

  if (await tryWebhook()) return;
  if (await tryApi()) return;
  if (await tryPlaywright()) return;
  if (await tryCdp()) return;

  if (process.env.HOSTINGER_EMAIL && process.env.HOSTINGER_PASSWORD) {
    console.log('\n═══ 4b/4 Chrome CDP redeploy seul ═══');
    try {
      execSync('node scripts/hostinger-redeploy-cdp.mjs', { stdio: 'inherit', env: process.env });
      return;
    } catch {
      console.warn('Chrome CDP échoué');
    }
  }

  console.error('\n❌ Aucune voie de déploiement disponible.');
  console.error('Ajoutez deploy/hostinger/.git-webhook-url OU .api-token');
  console.error('Ou : HOSTINGER_EMAIL + HOSTINGER_PASSWORD pour npm run hostinger:unlock');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
