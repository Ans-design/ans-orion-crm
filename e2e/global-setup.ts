import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { E2E_ADMIN } from './helpers/auth';
import { fillLoginForm, submitLoginForm, waitForLoginPageReady } from './helpers/login-form';

const AUTH_DIR = path.join(__dirname, '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'prod-admin.json');

async function launchBrowser() {
  const attempts: Array<Parameters<typeof chromium.launch>[0]> = [
    {},
    { channel: 'msedge' },
    { channel: 'chrome' },
  ];
  let lastError: unknown;
  for (const opts of attempts) {
    try {
      return await chromium.launch(opts);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function loginAndSaveState(baseURL: string) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  const page = await context.newPage();

  await waitForLoginPageReady(page);
  await fillLoginForm(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await submitLoginForm(page);
  await page.waitForURL('**/dashboard**', { timeout: 90_000, waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /admin ans/i }).waitFor({ state: 'visible', timeout: 45_000 });

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log(`[E2E] Session admin prod enregistrée → ${AUTH_FILE}`);
}

export default async function globalSetup(config: FullConfig) {
  if (process.env.E2E_SKIP_GLOBAL_SETUP === '1') {
    console.log('[E2E] globalSetup ignoré (E2E_SKIP_GLOBAL_SETUP=1)');
    return;
  }

  const isRemoteE2E = process.env.E2E_REMOTE === 'true';
  if (!isRemoteE2E) {
    console.log('[E2E] Préparation DB/serveur via webServer (e2e:server)…\n');
    return;
  }

  const baseURL = process.env.E2E_BASE_URL || config.projects[0]?.use?.baseURL;
  if (!baseURL || typeof baseURL !== 'string') {
    throw new Error('E2E_BASE_URL requis pour E2E_REMOTE');
  }

  // Dev local déjà démarré (ex. :3020) — les specs se connectent elles-mêmes.
  if (/127\.0\.0\.1|localhost/i.test(baseURL)) {
    console.log(`[E2E] Base locale ${baseURL} — skip auth prod globale`);
    return;
  }

  console.log(`[E2E] Connexion admin prod (${baseURL})…`);
  await loginAndSaveState(baseURL);
}
