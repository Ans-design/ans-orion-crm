/**
 * Met à jour les variables d'environnement Node.js sur hPanel + redéploie.
 * HOSTINGER_EMAIL, HOSTINGER_PASSWORD, HOSTINGER_OTP (si 2FA)
 */
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

const EMAIL = process.env.HOSTINGER_EMAIL || '';
const PASSWORD = process.env.HOSTINGER_PASSWORD || '';
const OTP = process.env.HOSTINGER_OTP || '';
const SITE = process.env.HOSTINGER_SITE || 'darkorchid-badger-644294.hostingersite.com';
const ENV_FILE = path.join(process.cwd(), 'deploy', 'hostinger', 'orion.env');
const SHOTS = path.join(process.cwd(), 'deploy', 'hostinger', 'screenshots');

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`📸 ${name}`);
}

async function waitPastCloudflare(page, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok =
      (await page.locator('input[type="email"]').first().isVisible().catch(() => false)) ||
      (await page.getByText(/authentification à deux facteurs|two-factor/i).isVisible().catch(() => false)) ||
      page.url().includes('hpanel.hostinger.com');
    if (ok) return;
    await page.waitForTimeout(2500);
  }
  throw new Error('Cloudflare — connexion hPanel bloquée');
}

async function login(page) {
  await page.goto('https://auth.hostinger.com/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitPastCloudflare(page);

  if (await page.getByText(/authentification à deux facteurs|two-factor/i).isVisible().catch(() => false)) {
    if (!OTP) throw new Error('HOSTINGER_OTP requis (code e-mail 6 chiffres)');
    await page.locator('input[type="tel"], input[inputmode="numeric"]').first().fill(OTP);
    await page.getByRole('button', { name: /vérifier|verify/i }).click();
  } else {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.getByRole('button', { name: /log in|connexion/i }).click();
    await page.waitForTimeout(4000);
    if (await page.getByText(/authentification à deux facteurs|two-factor/i).isVisible().catch(() => false)) {
      if (!OTP) throw new Error('HOSTINGER_OTP requis après login');
      await page.locator('input[type="tel"], input[inputmode="numeric"]').first().fill(OTP);
      await page.getByRole('button', { name: /vérifier|verify/i }).click();
    }
  }
  await page.waitForURL(/hpanel\.hostinger\.com/, { timeout: 120000 });
  await page.waitForTimeout(4000);
}

function parseEnvFile() {
  if (!fs.existsSync(ENV_FILE)) throw new Error(`Fichier absent : ${ENV_FILE}`);
  return fs.readFileSync(ENV_FILE, 'utf8');
}

async function openNodeJsApp(page) {
  console.log('→ Liste Node.js…');
  await page.goto('https://hpanel.hostinger.com/websites', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);

  const nodeFilter = page.getByText(/^Node\.js$/i).first();
  if (await nodeFilter.isVisible({ timeout: 8000 }).catch(() => false)) {
    await nodeFilter.click();
    await page.waitForTimeout(3000);
  }
  await shot(page, 'env-02-websites');

  const siteRow = page.locator('div, li, tr').filter({ hasText: SITE }).first();
  const dashBtn = siteRow.getByRole('button', { name: /tableau de bord|dashboard/i }).first();
  if (await dashBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await dashBtn.click();
  } else {
    await page.getByText(SITE).first().click();
  }
  await page.waitForTimeout(6000);
  await shot(page, 'env-03-site-dashboard');

  const envNav = page.getByText(/variables d.environnement/i).first();
  if (await envNav.isVisible({ timeout: 10000 }).catch(() => false)) {
    await envNav.click();
    await page.waitForTimeout(5000);
  }
  await shot(page, 'env-04-nodejs');
}

async function setEnvironmentVariables(page, envText) {
  await page.waitForTimeout(5000);
  const envHeading = page.getByRole('heading', { name: /variables d.environnement/i });
  if (!(await envHeading.isVisible({ timeout: 15000 }).catch(() => false))) {
    const envLink = page.getByText(/variables d.environnement|environment variables/i).first();
    if (await envLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await envLink.click();
      await page.waitForTimeout(4000);
    }
  }
  await shot(page, 'env-05-env-tab');

  const lines = envText.split('\n').filter((l) => l && !l.startsWith('#'));
  for (const line of lines) {
    try {
    const i = line.indexOf('=');
    if (i < 1) continue;
    const key = line.slice(0, i);
    const value = line.slice(i + 1);

    const row = page.locator('table tbody tr').filter({
      has: page.getByText(key, { exact: true }),
    }).first();

    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editBtn = row.locator('button:not([disabled])').first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(600);
        const valInput = page.locator('input:visible:not([type="file"]):not([type="hidden"])').last();
        await valInput.fill(value);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1200);
        console.log(`  ✓ ${key}`);
        continue;
      }
    }

    const addBtn = page.getByRole('button', { name: /^ajouter$/i }).first();
    if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log(`  · ${key} — ajout ignoré (déjà présent ou UI différente)`);
      continue;
    }
    await addBtn.click();
    await page.waitForTimeout(800);
    const visibleInputs = page.locator('input:visible:not([type="file"]):not([type="hidden"])');
    const n = await visibleInputs.count();
    if (n >= 2) {
      await visibleInputs.nth(n - 2).fill(key);
      await visibleInputs.nth(n - 1).fill(value);
      const confirm = page.getByRole('button', { name: /save|enregistrer|confirm|ajouter/i }).last();
      if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click();
      await page.waitForTimeout(1000);
    }
    } catch (e) {
      console.warn(`  ⚠ ${line.split('=')[0]}:`, e.message);
    }
  }
  console.log('→ Variables mises à jour');
  await shot(page, 'env-06-filled');
}

async function triggerRedeploy(page) {
  await page.goto('https://hpanel.hostinger.com/websites', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const siteRow = page.locator('div, li, tr').filter({ hasText: SITE }).first();
  await siteRow.getByRole('button', { name: /tableau de bord|dashboard/i }).first().click();
  await page.waitForTimeout(5000);

  const redeploy = page.getByRole('button', { name: /^redéployer$/i }).first();
  if (await redeploy.isVisible({ timeout: 10000 }).catch(() => false)) {
    await redeploy.click();
    await page.waitForTimeout(3000);
    const confirm = page.getByRole('button', { name: /confirm|confirmer|yes|oui|redéployer/i }).last();
    if (await confirm.isVisible({ timeout: 5000 }).catch(() => false)) await confirm.click();
    console.log('→ Redéploiement Git lancé');
    return true;
  }
  return false;
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('HOSTINGER_EMAIL et HOSTINGER_PASSWORD requis');
    process.exit(1);
  }

  const envText = parseEnvFile();
  const headless = process.env.HOSTINGER_HEADLESS !== 'false';
  const browser = await chromium.launch({
    headless,
    channel: headless ? undefined : 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(90000);

  try {
    console.log('→ Connexion hPanel…');
    await login(page);
    await shot(page, 'env-01-logged-in');

    await openNodeJsApp(page);
    await setEnvironmentVariables(page, envText);
    const redeployed = await triggerRedeploy(page);
    await shot(page, 'env-07-done');

    if (!redeployed) console.warn('⚠ Bouton redéployer introuvable — sauvegardez manuellement dans hPanel');
    console.log(`✓ Terminé pour ${SITE}`);
  } catch (e) {
    await shot(page, 'env-error').catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
