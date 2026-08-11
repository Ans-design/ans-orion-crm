/**
 * Utilitaires CDP Hostinger — Chrome réel, contourne Cloudflare Playwright.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

export const SITE = process.env.HOSTINGER_SITE || 'darkorchid-badger-644294.hostingersite.com';
export const EMAIL = process.env.HOSTINGER_EMAIL || '';
export const PASSWORD = process.env.HOSTINGER_PASSWORD || '';
export const OTP = process.env.HOSTINGER_OTP || '';
export const CHROME_DIR = path.join(process.cwd(), 'deploy', 'hostinger', '.chrome-cdp');
export const SHOTS = path.join(process.cwd(), 'deploy', 'hostinger', 'screenshots');
export const CDP_PORT = Number(process.env.HOSTINGER_CDP_PORT || 9333);

export function chromePath() {
  for (const p of [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean)) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function waitCdp(ms = 30000) {
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

export async function launchChrome() {
  fs.mkdirSync(CHROME_DIR, { recursive: true });
  const exe = chromePath();
  if (!exe) throw new Error('Chrome introuvable');

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

export async function connectCdp() {
  await launchChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(90000);
  return { browser, page };
}

export async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `unlock-${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 15000, animations: 'disabled' });
    console.log(`📸 ${file}`);
  } catch {
    console.warn(`⚠ Screenshot ${name} ignoré`);
  }
}

export async function ensureHpanelLogin(page) {
  await page.goto('https://hpanel.hostinger.com/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);

  if (page.url().includes('hpanel.hostinger.com') && !page.url().includes('auth.')) return;

  await page.goto('https://auth.hostinger.com/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  if (await page.locator('input[type="email"]').first().isVisible().catch(() => false)) {
    if (!EMAIL || !PASSWORD) throw new Error('HOSTINGER_EMAIL et HOSTINGER_PASSWORD requis');
    await page.locator('input[type="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole('button', { name: /log in|connexion|se connecter/i }).click();
    await page.waitForTimeout(5000);
  }

  if (await page.getByText(/authentification à deux facteurs|two-factor/i).isVisible().catch(() => false)) {
    if (!OTP) throw new Error('HOSTINGER_OTP requis (code e-mail 6 chiffres)');
    await page.locator('input[type="tel"], input[inputmode="numeric"]').first().fill(OTP);
    await page.getByRole('button', { name: /vérifier|verify/i }).click();
  }

  await page.waitForURL(/hpanel\.hostinger\.com/, { timeout: 180000 });
}

export async function openDeploymentsPage(page) {
  const url = `https://hpanel.hostinger.com/websites/${SITE}/deployments`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  for (let i = 0; i < 25; i++) {
    const skeleton = await page
      .locator('[class*="skeleton"], [class*="Skeleton"]')
      .first()
      .isVisible()
      .catch(() => false);
    const ready = await page
      .getByText(/déploiement automatique|automatic deployment|paramètres et redéploiement/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (ready && !skeleton) break;
    await page.waitForTimeout(2000);
  }
}

export async function extractGitWebhookUrl(page) {
  const settingsBtn = page
    .getByRole('button', { name: /paramètres et redéploiement|settings and redeploy/i })
    .first();
  if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    if (await settingsBtn.isEnabled().catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(4000);
    }
  }

  const patterns = [
    /https:\/\/[^\s"'<>]*builders\.hostinger\.com[^\s"'<>]*/gi,
    /https:\/\/[^\s"'<>]*webhook[^\s"'<>]*/gi,
    /https:\/\/[^\s"'<>]*git[^\s"'<>]*deploy[^\s"'<>]*/gi,
  ];

  const inputs = await page.locator('input[type="text"], input:not([type])').all();
  for (const input of inputs) {
    const val = (await input.inputValue().catch(() => '')).trim();
    if (val.startsWith('https://') && (val.includes('webhook') || val.includes('builders.hostinger'))) {
      return val;
    }
  }

  const html = await page.content();
  for (const re of patterns) {
    const hits = html.match(re);
    if (hits?.length) {
      const best = hits.find((u) => u.includes('builders.hostinger') || u.includes('webhook'));
      if (best) return best.replace(/&amp;/g, '&');
    }
  }

  const copyNear = page.locator('text=/webhook|déploiement automatique/i').first();
  if (await copyNear.isVisible({ timeout: 3000 }).catch(() => false)) {
    const row = page.locator('div, section, tr').filter({ has: copyNear }).first();
    const text = await row.innerText().catch(() => '');
    const m = text.match(/https:\/\/\S+/);
    if (m) return m[0];
  }

  return null;
}

export async function saveWebhookUrl(url) {
  const file = path.join(process.cwd(), 'deploy', 'hostinger', '.git-webhook-url');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, url.trim() + '\n');
  console.log(`✓ Webhook Git enregistré → deploy/hostinger/.git-webhook-url`);
  return file;
}

export async function waitDeployIdle(page, maxMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const building = await page
      .getByText(/compilation en cours|building|deploying|en cours|loading/i)
      .first()
      .isVisible()
      .catch(() => false);
    const saveBtn = page.locator('[data-qa="deployment-settings-save-and-redeploy-button"]').first();
    const loading = await saveBtn
      .evaluate((el) => el.classList.contains('h-button-v2--loading'))
      .catch(() => false);
    if (!building && !loading) return true;
    console.log('  … déploiement en cours…');
    await page.waitForTimeout(8000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  return false;
}

export async function triggerSettingsRedeploy(page) {
  const btn = page
    .getByRole('button', { name: /paramètres et redéploiement|settings and redeploy/i })
    .or(page.locator('[data-qa="deployment-settings-save-and-redeploy-button"]'))
    .first();

  if (await btn.isVisible({ timeout: 10000 }).catch(() => false)) {
    const enabled = await btn.isEnabled().catch(() => false);
    if (!enabled) {
      console.log('✓ Déploiement déjà en cours');
      return 'in_progress';
    }
    await btn.click();
    await page.waitForTimeout(3000);
    const confirm = page
      .getByRole('button', { name: /^confirmer$|^confirm$/i })
      .filter({ hasNot: page.locator('.h-button-v2--loading, .h-button-v2--disabled') })
      .first();
    if (await confirm.isVisible({ timeout: 8000 }).catch(() => false)) {
      if (await confirm.isEnabled().catch(() => false)) await confirm.click();
    }
    return 'started';
  }

  const redeploy = page.getByRole('button', { name: /^redéployer$/i }).first();
  if (await redeploy.isVisible({ timeout: 8000 }).catch(() => false)) {
    await redeploy.click();
    return 'started';
  }

  return 'skipped';
}
