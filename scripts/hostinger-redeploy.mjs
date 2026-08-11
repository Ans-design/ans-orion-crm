/** Redéploie l'app Node.js Hostinger (après push Git). */
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

const EMAIL = process.env.HOSTINGER_EMAIL || '';
const PASSWORD = process.env.HOSTINGER_PASSWORD || '';
const OTP = process.env.HOSTINGER_OTP || '';
const SITE = process.env.HOSTINGER_SITE || 'darkorchid-badger-644294.hostingersite.com';
const PROFILE = path.join(process.cwd(), 'deploy', 'hostinger', '.pw-profile');
const SHOTS = path.join(process.cwd(), 'deploy', 'hostinger', 'screenshots');

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `redeploy-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`📸 ${file}`);
}

async function isCloudflareChallenge(page) {
  const url = page.url();
  if (!url.includes('auth.hostinger.com') && !url.includes('challenges.cloudflare.com')) return false;
  const body = await page.locator('body').innerText().catch(() => '');
  return /vérification de sécurité|just a moment|vérifions|checking your browser|cloudflare|ray id/i.test(body);
}

async function solveTurnstile(page) {
  for (let i = 0; i < 60; i++) {
    if (!(await isCloudflareChallenge(page))) return;
    console.log('  … case Cloudflare « humain »');
    const iframeSelectors = [
      'iframe[src*="challenges.cloudflare.com"]',
      'iframe[src*="turnstile"]',
      'iframe[title*="Widget"]',
    ];
    for (const sel of iframeSelectors) {
      const frame = page.frameLocator(sel).first();
      await frame.locator('body, input[type="checkbox"], label').first().click({ timeout: 1500, force: true }).catch(() => {});
    }
    const box = await page.locator('.cf-turnstile, [data-sitekey], #content').first().boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + Math.min(28, box.width / 3), box.y + box.height / 2);
    }
    await page
      .getByText(/vérifiez que vous êtes humain|verify you are human/i)
      .click({ timeout: 1500, force: true })
      .catch(() => {});
    await page.waitForTimeout(3500);
  }
}

async function isLoggedIn(page) {
  if (!page.url().includes('hpanel.hostinger.com') || page.url().includes('auth.')) return false;
  if (await isCloudflareChallenge(page)) return false;
  return page
    .getByText(/sites web|websites|bienvenue|welcome|tableau de bord/i)
    .first()
    .isVisible({ timeout: 8000 })
    .catch(() => false);
}

async function waitPastCloudflare(page, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const onChallenge = await isCloudflareChallenge(page);
    const hasEmail = await page
      .locator('input[type="email"], input[name="email"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasOtp = await page
      .getByText(/authentification à deux facteurs|two-factor/i)
      .isVisible()
      .catch(() => false);
    const onHpanel = page.url().includes('hpanel.hostinger.com') && !page.url().includes('auth.');
    if (onChallenge) {
      console.log('  … Cloudflare, attente auto-vérification');
      await page.waitForTimeout(4000);
      continue;
    }
    if (hasEmail || hasOtp || onHpanel) return;
    await page.waitForTimeout(2500);
  }
  await shot(page, 'cloudflare-timeout');
  throw new Error('Cloudflare bloque la connexion — créez deploy/hostinger/.api-token pour npm run hostinger:redeploy:api');
}

async function completeTwoFactor(page) {
  const otpHeading = page.getByText(/authentification à deux facteurs|two-factor|2fa/i);
  if (!(await otpHeading.isVisible({ timeout: 8000 }).catch(() => false))) return;

  const code = OTP.trim();
  if (!code) {
    await shot(page, '2fa-required');
    throw new Error('2FA requis : HOSTINGER_OTP=123456 npm run hostinger:redeploy');
  }

  const otpInput = page
    .locator('input[type="tel"], input[inputmode="numeric"], input[autocomplete="one-time-code"]')
    .first();
  await otpInput.fill(code);
  await page.getByRole('button', { name: /vérifier|verify|continuer/i }).click();
  await page.waitForURL(/hpanel\.hostinger\.com/, { timeout: 120000 });
}

async function login(page) {
  await page.goto('https://hpanel.hostinger.com/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);
  if (await isLoggedIn(page)) return;

  await page.goto('https://auth.hostinger.com/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitPastCloudflare(page);
  await solveTurnstile(page);

  if (await isLoggedIn(page)) return;

  if (await page.locator('input[type="email"], input[name="email"]').first().isVisible().catch(() => false)) {
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole('button', { name: /log in|connexion|se connecter/i }).click();
    await page.waitForTimeout(4000);
    await solveTurnstile(page);
  }

  await completeTwoFactor(page);
  await solveTurnstile(page);

  if (!(await isLoggedIn(page))) {
    await page.waitForURL(/hpanel\.hostinger\.com/, { timeout: 120000 });
    await page.waitForTimeout(3000);
  }
  if (!(await isLoggedIn(page))) {
    await shot(page, 'login-incomplete');
    throw new Error('Connexion hPanel incomplète — Cloudflare ou 2FA (HOSTINGER_OTP)');
  }
}

async function triggerRedeploy(page) {
  const siteSlug = SITE.replace(/\./g, '-');
  const directUrls = [
    `https://hpanel.hostinger.com/websites/${SITE}`,
    `https://hpanel.hostinger.com/websites/${siteSlug}`,
    'https://hpanel.hostinger.com/websites',
  ];

  for (const url of directUrls) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (await isCloudflareChallenge(page)) {
      await waitPastCloudflare(page);
      await solveTurnstile(page);
    }
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(4000);
    if (page.url().includes(SITE) || page.url().includes('nodejs') || page.url().includes('dashboard')) {
      break;
    }
  }

  const search = page.locator('input[type="search"], input[placeholder*="earch"], input[placeholder*="herch"]').first();
  if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
    await search.fill('darkorchid');
    await page.waitForTimeout(2500);
  }

  const nodeFilter = page.getByText(/^Node\.js$/i).first();
  if (await nodeFilter.isVisible({ timeout: 6000 }).catch(() => false)) {
    await nodeFilter.click();
    await page.waitForTimeout(3000);
  }

  const sitePatterns = [SITE, 'darkorchid-badger', 'hostingersite.com'];
  let opened = false;
  for (const pat of sitePatterns) {
    const link = page.getByRole('link', { name: new RegExp(pat, 'i') }).first();
    const row = page.locator('a, button, div, tr').filter({ hasText: new RegExp(pat, 'i') }).first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      opened = true;
      break;
    }
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      const dash = row.getByRole('button', { name: /tableau de bord|dashboard|gérer|manage/i }).first();
      if (await dash.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dash.click();
      } else {
        await row.click();
      }
      opened = true;
      break;
    }
  }

  if (!opened) {
    await shot(page, 'sites-list');
    throw new Error(`Site ${SITE} introuvable dans hPanel — voir screenshot sites-list`);
  }

  await page.waitForTimeout(6000);
  await shot(page, 'dashboard');

  for (const label of [/déploiement/i, /deployment/i, /settings/i, /paramètres/i]) {
    const nav = page.getByText(label).first();
    if (await nav.isVisible({ timeout: 4000 }).catch(() => false)) {
      await nav.click();
      await page.waitForTimeout(3000);
      break;
    }
  }

  const redeploySelectors = [
    page.getByRole('button', { name: /^redéployer$/i }).first(),
    page.getByRole('button', { name: /redéployer|redeploy/i }).first(),
    page.getByRole('button', { name: /^déployer$/i }).first(),
    page.getByRole('link', { name: /redéployer|redeploy/i }).first(),
  ];

  for (const btn of redeploySelectors) {
    if (await btn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(2000);
      const confirm = page.getByRole('button', { name: /confirm|confirmer|yes|oui|redéployer|déployer/i }).last();
      if (await confirm.isVisible({ timeout: 5000 }).catch(() => false)) await confirm.click();
      console.log('✓ Redéploiement lancé sur', SITE);
      await shot(page, 'redeploy-clicked');
      return true;
    }
  }

  await shot(page, 'no-redeploy-button');
  return false;
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('HOSTINGER_EMAIL et HOSTINGER_PASSWORD requis.');
    process.exit(1);
  }

  const headless = process.env.HOSTINGER_HEADLESS !== 'false';
  fs.mkdirSync(PROFILE, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless,
    channel: headless ? undefined : 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
    locale: 'fr-FR',
    viewport: { width: 1280, height: 900 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(90000);

  try {
    console.log('→ Connexion hPanel…');
    await login(page);
    await shot(page, 'logged-in');
    const ok = await triggerRedeploy(page);
    if (!ok) {
      console.warn('⚠ Bouton redéployer introuvable — voir screenshots/');
      process.exit(1);
    }
    await page.waitForTimeout(5000);
  } catch (e) {
    await shot(page, 'error').catch(() => {});
    throw e;
  } finally {
    await context.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
