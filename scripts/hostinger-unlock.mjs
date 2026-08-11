/**
 * Débloque tous les canaux de déploiement Hostinger :
 * 1. CDP hPanel (session Chrome persistante)
 * 2. Extraction webhook Git → deploy/hostinger/.git-webhook-url
 * 3. Sync variables orion.env
 * 4. Redéploiement + healthcheck
 *
 * HOSTINGER_EMAIL, HOSTINGER_PASSWORD (+ HOSTINGER_OTP si 2FA)
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  SITE,
  EMAIL,
  PASSWORD,
  connectCdp,
  ensureHpanelLogin,
  extractGitWebhookUrl,
  openDeploymentsPage,
  saveWebhookUrl,
  shot,
  triggerSettingsRedeploy,
  waitDeployIdle,
} from './hostinger-cdp-shared.mjs';

const ENV_FILE = path.join(process.cwd(), 'deploy', 'hostinger', 'orion.env');
const WEBHOOK_FILE = path.join(process.cwd(), 'deploy', 'hostinger', '.git-webhook-url');

async function syncEnvVars(page) {
  if (!fs.existsSync(ENV_FILE)) {
    console.log('→ Génération orion.env…');
    execSync('node scripts/hostinger-orchestrate.mjs', { stdio: 'inherit' });
  }
  const envText = fs.readFileSync(ENV_FILE, 'utf8');
  const envUrl = `https://hpanel.hostinger.com/websites/${SITE}/nodejs/environment-variables`;
  await page.goto(envUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(5000);
  await shot(page, 'env-page');

  const settingsUrl = `https://hpanel.hostinger.com/websites/${SITE}/deployments`;
  await page.goto(settingsUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const settingsBtn = page.getByRole('button', { name: /paramètres et redéploiement/i }).first();
  if (await settingsBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await settingsBtn.click();
    await page.waitForTimeout(4000);
  }
  await shot(page, 'env-settings');

  const importBtn = page.getByRole('button', { name: /importer un fichier|import.*\.env/i }).first();
  if (await importBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 8000 }),
        importBtn.click(),
      ]);
      await chooser.setFiles(ENV_FILE);
      await page.waitForTimeout(2000);
      console.log('→ orion.env importé via hPanel');
      const saveRedeploy = page.getByRole('button', { name: /enregistrer et redéployer|save and redeploy/i }).first();
      if (await saveRedeploy.isVisible({ timeout: 8000 }).catch(() => false)) {
        if (await saveRedeploy.isEnabled().catch(() => false)) {
          await saveRedeploy.click();
          console.log('→ Enregistrer et redéployer cliqué');
          return 'started';
        }
      }
      return 'imported';
    } catch (e) {
      console.warn('Import .env échoué, sync manuelle…', e.message);
    }
  }

  const lines = envText.split('\n').filter((l) => l && !l.startsWith('#'));
  const vars = Object.fromEntries(
    lines.map((line) => {
      const i = line.indexOf('=');
      return i < 1 ? null : [line.slice(0, i), line.slice(i + 1)];
    }).filter(Boolean),
  );

  // Corriger clé cassée ALLOW_V29 → ALLOW_V29_AUTH (vu sur hPanel)
  const broken = page.locator('table tbody tr').filter({
    has: page.getByText('ALLOW_V29', { exact: true }),
  }).first();
  if (await broken.isVisible({ timeout: 3000 }).catch(() => false)) {
    const del = broken.locator('button').last();
    if (await del.isVisible().catch(() => false)) {
      await del.click();
      await page.waitForTimeout(800);
      console.log('  ✓ ALLOW_V29 supprimé (clé incorrecte)');
    }
  }

  let updated = 0;
  for (const [key, value] of Object.entries(vars)) {
    try {
      const row = page.locator('table tbody tr').filter({
        has: page.getByText(key, { exact: true }),
      }).first();
      if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
        const editBtn = row.locator('button:not([disabled])').first();
        if (await editBtn.isVisible().catch(() => false)) {
          await editBtn.click();
          await page.waitForTimeout(500);
          const valInput = page.locator('input:visible:not([type="file"]):not([type="hidden"])').last();
          await valInput.fill(value);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(800);
          updated++;
          console.log(`  ✓ ${key}`);
          continue;
        }
      }

      const addBtn = page.getByRole('button', { name: /^ajouter$/i }).first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(600);
        const visibleInputs = page.locator('input:visible:not([type="file"]):not([type="hidden"])');
        const n = await visibleInputs.count();
        if (n >= 2) {
          await visibleInputs.nth(n - 2).fill(key);
          await visibleInputs.nth(n - 1).fill(value);
          const confirm = page.getByRole('button', { name: /save|enregistrer|confirm|ajouter/i }).last();
          if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click();
          await page.waitForTimeout(1000);
          updated++;
          console.log(`  + ${key}`);
        }
      }
    } catch {
      /* ignore */
    }
  }
  console.log(`→ ${updated} variable(s) synchronisée(s)`);

  const saveRedeploy = page.getByRole('button', { name: /enregistrer et redéployer|save and redeploy/i }).first();
  if (await saveRedeploy.isVisible({ timeout: 8000 }).catch(() => false)) {
    if (await saveRedeploy.isEnabled().catch(() => false)) {
      await saveRedeploy.click();
      console.log('→ Enregistrer et redéployer cliqué');
      return 'started';
    }
  }
  return 'skipped';
}

async function testWebhook() {
  if (!fs.existsSync(WEBHOOK_FILE)) return false;
  const url = fs.readFileSync(WEBHOOK_FILE, 'utf8').trim();
  if (!url) return false;
  console.log('→ Test webhook Git…');
  const res = await fetch(url, { method: 'POST' });
  const text = await res.text().catch(() => '');
  console.log(`  HTTP ${res.status}`, text.slice(0, 120));
  return res.ok;
}

async function healthcheck() {
  const base = (process.env.SITE_URL || `https://${SITE}`).replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(8000) });
    const body = await res.json().catch(() => ({}));
    return res.status === 200 && body.ok;
  } catch {
    return false;
  }
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('HOSTINGER_EMAIL et HOSTINGER_PASSWORD requis');
    process.exit(1);
  }

  console.log(`\n═══ Déblocage déploiement Hostinger — ${SITE} ═══\n`);

  const { browser, page } = await connectCdp();
  try {
    await ensureHpanelLogin(page);
    await shot(page, 'logged-in');

    await openDeploymentsPage(page);
    await shot(page, 'deployments');

    const webhook = await extractGitWebhookUrl(page);
    if (webhook) {
      await saveWebhookUrl(webhook);
    } else {
      console.warn('⚠ Webhook Git non trouvé sur la page — copiez-le manuellement dans deploy/hostinger/.git-webhook-url');
    }

    const syncResult = await syncEnvVars(page);
    const redeploy = syncResult === 'started' ? 'started' : await triggerSettingsRedeploy(page);
    console.log(`→ Redéploiement : ${redeploy}`);
    await shot(page, 'redeploy');

    if (redeploy === 'started' || redeploy === 'in_progress') {
      await openDeploymentsPage(page);
      await waitDeployIdle(page, 600000);
    }
  } finally {
    await browser.close();
  }

  if (fs.existsSync(WEBHOOK_FILE)) {
    await testWebhook();
  }

  console.log('\n→ Healthcheck final…');
  for (let i = 0; i < 12; i++) {
    if (await healthcheck()) {
      console.log('✅ Site opérationnel\n');
      execSync('npm run hostinger:healthcheck', { stdio: 'inherit' });
      return;
    }
    console.log(`  attente ${(i + 1) * 30}s…`);
    await new Promise((r) => setTimeout(r, 30_000));
  }

  console.warn('⚠ Site pas encore prêt — relancez: npm run hostinger:healthcheck');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
