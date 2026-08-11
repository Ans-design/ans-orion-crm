/**
 * Attend la fin du déploiement Git Hostinger + healthcheck.
 * Usage: npm run hostinger:wait-deploy
 */
import { execSync } from 'child_process';
import {
  EMAIL,
  PASSWORD,
  connectCdp,
  ensureHpanelLogin,
  openDeploymentsPage,
  shot,
  waitDeployIdle,
} from './hostinger-cdp-shared.mjs';

async function healthOk() {
  const base = (process.env.SITE_URL || 'https://darkorchid-badger-644294.hostingersite.com').replace(/\/$/, '');
  try {
    const h = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(8000) });
    const hb = await h.json().catch(() => ({}));
    const d = await fetch(`${base}/api/health/db`, { signal: AbortSignal.timeout(15000) });
    const db = await d.json().catch(() => ({}));
    console.log(`/api/health → ${h.status}`, JSON.stringify(hb));
    console.log(`/api/health/db → ${d.status}`, JSON.stringify(db));
    return h.status === 200 && hb.ok && d.status === 200 && db.ok;
  } catch (e) {
    console.log('probe error:', e.message);
    return false;
  }
}

async function main() {
  if (EMAIL && PASSWORD) {
    const { browser, page } = await connectCdp();
    try {
      await ensureHpanelLogin(page);
      await openDeploymentsPage(page);
      await shot(page, 'wait-deploy');
      await waitDeployIdle(page, 900000);
    } finally {
      await browser.close();
    }
  }

  for (let i = 0; i < 30; i++) {
    if (await healthOk()) {
      console.log('\n✅ Déploiement terminé — site OK\n');
      return;
    }
    console.log(`\nAttente ${(i + 1) * 30}s…`);
    await new Promise((r) => setTimeout(r, 30_000));
  }

  console.error('\n❌ Timeout — vérifiez hPanel → Journaux d\'exécution');
  execSync('npm run hostinger:healthcheck', { stdio: 'inherit' });
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
