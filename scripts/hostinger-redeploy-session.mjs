/**
 * Redéploiement hPanel via session Chrome CDP persistante (sans mot de passe si déjà connecté).
 */
import { execSync } from 'child_process';
import {
  connectCdp,
  ensureHpanelLogin,
  triggerSettingsRedeploy,
  waitDeployIdle,
  shot,
  SITE,
} from './hostinger-cdp-shared.mjs';

async function healthOk() {
  const base = `https://${SITE}`;
  try {
    const h = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(8000) });
    const hb = await h.json().catch(() => ({}));
    return h.status === 200 && hb.ok;
  } catch {
    return false;
  }
}

async function gotoDeployments(page) {
  const url = `https://hpanel.hostinger.com/websites/${SITE}/deployments`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      break;
    } catch (e) {
      if (attempt === 3) throw e;
      console.warn(`Navigation tentative ${attempt}…`, e.message?.slice(0, 80));
      await page.waitForTimeout(3000);
    }
  }
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  for (let i = 0; i < 25; i++) {
    const skeleton = await page.locator('[class*="skeleton"], [class*="Skeleton"]').first().isVisible().catch(() => false);
    const ready = await page
      .getByText(/déploiement automatique|automatic deployment|paramètres et redéploiement|redéployer/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (ready && !skeleton) break;
    await page.waitForTimeout(2000);
  }
}

async function main() {
  console.log(`\n═══ Redéploiement hPanel — ${SITE} ═══\n`);
  const { browser, page } = await connectCdp();
  try {
    await ensureHpanelLogin(page);
    await shot(page, 'session-logged-in');
    await gotoDeployments(page);
    await shot(page, 'deployments');

    const redeploy = await triggerSettingsRedeploy(page);
    console.log(`→ Redéploiement : ${redeploy}`);

    if (redeploy === 'skipped') {
      const candidates = [
        page.getByRole('button', { name: /^redéployer$/i }).first(),
        page.getByRole('button', { name: /redéployer|redeploy/i }).first(),
        page.locator('[data-qa="deployment-settings-save-and-redeploy-button"]').first(),
      ];
      let clicked = false;
      for (const btn of candidates) {
        if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
          if (await btn.isEnabled().catch(() => false)) {
            await btn.click();
            clicked = true;
            console.log('→ Bouton redéploiement cliqué');
            break;
          }
        }
      }
      if (!clicked) {
        throw new Error('Bouton redéploiement introuvable — connectez-vous dans hPanel ou fournissez HOSTINGER_EMAIL/PASSWORD');
      }
    }

    await shot(page, 'redeploy-triggered');
    await gotoDeployments(page);
    await waitDeployIdle(page, 900000);
    await shot(page, 'deploy-done');
  } finally {
    await browser.close();
  }

  console.log('\n→ Healthcheck…');
  for (let i = 0; i < 20; i++) {
    if (await healthOk()) {
      console.log('✅ Site opérationnel après redéploiement\n');
      execSync('npm run hostinger:healthcheck', { stdio: 'inherit' });
      return;
    }
    console.log(`  attente ${(i + 1) * 30}s…`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
  console.warn('⚠ Healthcheck timeout — relancez npm run hostinger:healthcheck');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
