/**
 * Redéploiement hPanel via Chrome réel (CDP) — contourne souvent Cloudflare.
 * HOSTINGER_EMAIL, HOSTINGER_PASSWORD, HOSTINGER_OTP (si 2FA)
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

const EMAIL = process.env.HOSTINGER_EMAIL || '';
const PASSWORD = process.env.HOSTINGER_PASSWORD || '';
const OTP = process.env.HOSTINGER_OTP || '';
const SITE = process.env.HOSTINGER_SITE || 'darkorchid-badger-644294.hostingersite.com';
const CHROME_DIR = path.join(process.cwd(), 'deploy', 'hostinger', '.chrome-cdp');
const CDP_PORT = 9333;

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function waitCdp(ms = 30000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Chrome CDP indisponible');
}

async function launchChrome() {
  fs.mkdirSync(CHROME_DIR, { recursive: true });
  const exe = chromePath();
  if (!exe) throw new Error('Chrome introuvable — installez Google Chrome');

  const proc = spawn(
    exe,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${CHROME_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  );
  proc.unref();
  await waitCdp();
  return proc;
}

const SHOTS = path.join(process.cwd(), 'deploy', 'hostinger', 'screenshots');

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `cdp-${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 15000, animations: 'disabled' });
    console.log(`📸 ${file}`);
  } catch {
    console.warn(`⚠ Screenshot ${name} ignoré (timeout)`);
  }
}

async function loginAndRedeploy(page) {
  await page.goto('https://hpanel.hostinger.com/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);

  if (!page.url().includes('hpanel.hostinger.com') || page.url().includes('auth.')) {
    await page.goto('https://auth.hostinger.com/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    if (await page.locator('input[type="email"]').first().isVisible().catch(() => false)) {
      await page.locator('input[type="email"]').first().fill(EMAIL);
      await page.locator('input[type="password"]').first().fill(PASSWORD);
      await page.getByRole('button', { name: /log in|connexion|se connecter/i }).click();
      await page.waitForTimeout(5000);
    }

    if (await page.getByText(/authentification à deux facteurs|two-factor/i).isVisible().catch(() => false)) {
      if (!OTP) throw new Error('HOSTINGER_OTP requis');
      await page.locator('input[type="tel"], input[inputmode="numeric"]').first().fill(OTP);
      await page.getByRole('button', { name: /vérifier|verify/i }).click();
    }

    await page.waitForURL(/hpanel\.hostinger\.com/, { timeout: 180000 });
  }
  await shot(page, 'logged-in');

  const directUrls = [
    `https://hpanel.hostinger.com/websites/${SITE}/deployments`,
    `https://hpanel.hostinger.com/websites/${SITE}/nodejs`,
    `https://hpanel.hostinger.com/websites/${SITE}`,
    'https://hpanel.hostinger.com/websites',
  ];

  for (const url of directUrls) {
    console.log('→', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(8000);
    if (page.url().includes(SITE) || page.url().includes('nodejs')) break;
  }
  await shot(page, 'site-page');

  const deploymentsUrl = `https://hpanel.hostinger.com/websites/${SITE}/deployments`;
  if (!page.url().includes('/deployments')) {
    console.log('→', deploymentsUrl);
    await page.goto(deploymentsUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(6000);
  }

  // Attendre la fin du skeleton de chargement
  for (let i = 0; i < 20; i++) {
    const skeleton = await page.locator('[class*="skeleton"], [class*="Skeleton"], [data-testid*="skeleton"]').first().isVisible().catch(() => false);
    const hasDeployText = await page.getByText(/déploiement automatique|automatic deployment|paramètres et redéploiement/i).first().isVisible().catch(() => false);
    if (hasDeployText && !skeleton) break;
    await page.waitForTimeout(2000);
  }
  await shot(page, 'deployments-ready');

  const settingsRedeploy = page.getByRole('button', { name: /paramètres et redéploiement|settings and redeploy/i }).first();
  const deployInProgress = await page.getByText(/compilation en cours|building|deploying|en cours/i).first().isVisible().catch(() => false);
  if (deployInProgress) {
    console.log('✓ Déploiement Git déjà en cours sur Hostinger');
    await shot(page, 'deploy-in-progress');
    return;
  }
  if (await settingsRedeploy.isVisible({ timeout: 15000 }).catch(() => false)) {
    const enabled = await settingsRedeploy.isEnabled().catch(() => false);
    if (!enabled) {
      console.log('✓ Déploiement en cours (bouton Paramètres désactivé)');
      await shot(page, 'deploy-in-progress-disabled');
      return;
    }
    await settingsRedeploy.click();
    await page.waitForTimeout(5000);
    await shot(page, 'settings-redeploy-open');
  }

  if (!page.url().includes(SITE)) {
    const nodeFilter = page.getByRole('tab', { name: /^Node\.js$/i }).first();
    if (await nodeFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nodeFilter.click({ force: true });
      await page.waitForTimeout(3000);
    }
  }

  const search = page.locator('input[type="search"], input[placeholder*="earch"], input[placeholder*="herch"]').first();
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
    await search.fill('darkorchid');
    await page.waitForTimeout(2500);
    await shot(page, 'search');
  }

  const sitePat = new RegExp('darkorchid-badger|hostingersite', 'i');
  if (!page.url().includes(SITE)) {
    const siteCard = page.locator('div, li, tr, article').filter({ hasText: sitePat }).first();
    const dashboardBtn = siteCard
      .getByRole('button', { name: /tableau de bord|dashboard|gérer|manage/i })
      .first();
    if (await dashboardBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await dashboardBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(5000);
      await shot(page, 'dashboard-from-home');
    }
  }
  if (!page.url().includes(SITE)) {
    const link = page.getByRole('link', { name: sitePat }).first();
    const row = page.locator('a, button, div, tr').filter({ hasText: sitePat }).first();
    if (await link.isVisible({ timeout: 8000 }).catch(() => false)) {
      await link.click();
    } else if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      const dash = row.getByRole('button', { name: /tableau de bord|dashboard|gérer|manage/i }).first();
      if (await dash.isVisible().catch(() => false)) await dash.click();
      else await row.click();
    }
    await page.waitForTimeout(6000);
    await shot(page, 'dashboard');
  }

  for (const label of [/déploiements/i, /deployments/i]) {
    const nav = page.getByRole('link', { name: label }).or(page.getByRole('button', { name: label })).or(page.getByText(label)).first();
    if (await nav.isVisible({ timeout: 8000 }).catch(() => false)) {
      await nav.click({ force: true });
      await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(4000);
      break;
    }
  }
  await shot(page, 'before-redeploy');

  const deploymentsDone = await page.getByText(/^Terminé$/i).first().isVisible({ timeout: 5000 }).catch(() => false);
  const currentDeploy = await page.getByText(/^Actuel$/i).first().isVisible({ timeout: 3000 }).catch(() => false);
  if (deploymentsDone && currentDeploy) {
    console.log('✓ Déploiement Git récent déjà actif — relance via bouton Redéployer');
  }

  for (const btn of [
    page.getByRole('button', { name: /^redéployer$/i }).first(),
    page.getByRole('button', { name: /redéployer|redeploy/i }).first(),
    page.getByRole('button', { name: /^déployer$/i }).first(),
    page.getByRole('link', { name: /redéployer|redeploy/i }).first(),
    page.locator('button, a').filter({ hasText: /^Redéployer$/i }).first(),
  ]) {
    if (await btn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await btn.click();
      const confirm = page
        .getByRole('button', { name: /^confirmer$|^confirm$/i })
        .filter({ hasNot: page.locator('.h-button-v2--loading, .h-button-v2--disabled') })
        .first();
      if (await confirm.isVisible({ timeout: 5000 }).catch(() => false)) {
        if (await confirm.isEnabled().catch(() => false)) await confirm.click();
      }
      await shot(page, 'redeploy-clicked');
      console.log('✓ Redéploiement lancé sur', SITE);
      return;
    }
  }

  await shot(page, 'no-redeploy-button');
  throw new Error('Bouton Redéployer introuvable — voir deploy/hostinger/screenshots/cdp-*.png');
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('HOSTINGER_EMAIL et HOSTINGER_PASSWORD requis');
    process.exit(1);
  }

  console.log('→ Lancement Chrome (CDP)…');
  await launchChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());

  try {
    await loginAndRedeploy(page);
    await page.waitForTimeout(5000);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
