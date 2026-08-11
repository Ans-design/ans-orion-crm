/**
 * Déploiement Hostinger via hPanel (Playwright) — sans Vercel.
 * Variables requises : HOSTINGER_EMAIL, HOSTINGER_PASSWORD
 * Optionnel : HOSTINGER_OTP (code 2FA e-mail), HOSTINGER_FQDN=orion.ansdesignprint.com
 */
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const EMAIL = process.env.HOSTINGER_EMAIL || '';
const PASSWORD = process.env.HOSTINGER_PASSWORD || '';
const OTP = process.env.HOSTINGER_OTP || '';
const FQDN = process.env.HOSTINGER_FQDN || 'orion.ansdesignprint.com';
const ZIP = path.join(process.cwd(), 'deploy', 'hostinger', 'orion-crm.zip');
const SHOTS = path.join(process.cwd(), 'deploy', 'hostinger', 'screenshots');

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`📸 ${name}`);
}

async function waitPastCloudflare(page, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hasEmail = await page.locator('input[type="email"], input[name="email"]').first().isVisible().catch(() => false);
    const hasOtp = await page.getByText(/authentification à deux facteurs|two-factor/i).isVisible().catch(() => false);
    const onHpanel = page.url().includes('hpanel.hostinger.com');
    if (hasEmail || hasOtp || onHpanel) return;
    await page.waitForTimeout(2000);
  }
  await shot(page, 'cloudflare-timeout');
  throw new Error('Cloudflare bloque la connexion automatisée — utilisez le déploiement manuel hPanel.');
}

async function completeTwoFactor(page) {
  const otpHeading = page.getByText(/authentification à deux facteurs|two-factor|2fa/i);
  if (!(await otpHeading.isVisible({ timeout: 8000 }).catch(() => false))) return;

  const code = OTP.trim();
  if (!code) {
    console.log('\n⚠ 2FA Hostinger requis — code envoyé par e-mail.');
    console.log('Relancez avec : HOSTINGER_OTP=123456 npm run hostinger:hpanel\n');
    await shot(page, '01-2fa-required');
    throw new Error('2FA requis : définissez HOSTINGER_OTP (code à 6 chiffres).');
  }

  const otpInput = page.locator('input[type="tel"], input[inputmode="numeric"], input[autocomplete="one-time-code"]').first();
  await otpInput.fill(code);
  await shot(page, '01-2fa-filled');
  await page.getByRole('button', { name: /vérifier|verify|continuer/i }).click();
  await page.waitForURL(/hpanel\.hostinger\.com/, { timeout: 120000 });
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('HOSTINGER_EMAIL et HOSTINGER_PASSWORD requis.');
    process.exit(1);
  }

  if (!fs.existsSync(ZIP)) {
    console.log('Génération archive…');
    execSync('node scripts/hostinger-package.mjs', { stdio: 'inherit' });
  }

  const headless = process.env.HOSTINGER_HEADLESS !== 'false';
  const browser = await chromium.launch({
    headless,
    channel: headless ? undefined : 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  try {
    console.log('→ Connexion Hostinger…');
    await page.goto('https://auth.hostinger.com/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPastCloudflare(page);

    const on2fa = await page.getByText(/authentification à deux facteurs|two-factor/i).isVisible().catch(() => false);
    if (!on2fa) {
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await shot(page, '00-login-filled');
      await page.getByRole('button', { name: /log in|connexion|se connecter/i }).click();
      await page.waitForTimeout(3000);
    }
    await completeTwoFactor(page);
    if (!page.url().includes('hpanel.hostinger.com')) {
      await page.waitForURL(/hpanel\.hostinger\.com/, { timeout: 120000 });
    }
    await page.waitForTimeout(3000);
    await shot(page, '01-after-login');

    console.log('→ hPanel Websites…');
    await page.goto('https://hpanel.hostinger.com/websites', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(5000);
    await shot(page, '02-websites');

    const domainLink = page.getByText(/ansdesignprint\.com/i).first();
    if (await domainLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await domainLink.click();
      await page.waitForTimeout(4000);
      await shot(page, '02b-domain-selected');
    }

    const nodeLink = page.getByText(/node\.?js|application web node/i).first();
    if (await nodeLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await nodeLink.click();
      await page.waitForTimeout(3000);
      await shot(page, '03-nodejs-section');
    }

    const uploadOpt = page.getByText(/upload|téléverser|importer|zip|archive/i).first();
    if (await uploadOpt.isVisible({ timeout: 10000 }).catch(() => false)) {
      await uploadOpt.click();
      await page.waitForTimeout(1500);
    }

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      console.log('→ Upload ZIP…');
      await fileInput.setInputFiles(ZIP);
      await page.waitForTimeout(5000);
      await shot(page, '04-uploaded');
    } else {
      console.warn('Champ fichier introuvable — capture pour diagnostic.');
      await shot(page, '04-no-file-input');
    }

    const deployBtn = page.getByRole('button', { name: /deploy|déployer|finish|terminer|continuer|suivant/i }).first();
    if (await deployBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await deployBtn.click();
      await page.waitForTimeout(8000);
      await shot(page, '05-deploy-clicked');
    }

  // API token pour déploiements futurs
    try {
      await page.goto('https://hpanel.hostinger.com/profile/api', { timeout: 30000 });
      await page.waitForTimeout(3000);
      await shot(page, '06-api-page');
      console.log('→ Créez un jeton API sur cette page pour npm run hostinger:deploy automatisé.');
    } catch { /* ignore */ }

    console.log(`\n✓ Tentative hPanel terminée. Vérifiez deploy/hostinger/screenshots/`);
    console.log(`→ URL cible après déploiement : https://${FQDN}/login`);
  } catch (e) {
    await shot(page, 'error').catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
