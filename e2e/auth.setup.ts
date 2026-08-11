import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginAsAdmin } from './helpers/auth';

const authDir = path.join(__dirname, '.auth');
const authFile = path.join(authDir, 'local-admin.json');
const AUTH_MAX_AGE_MS = 30 * 60 * 1000;

setup('authenticate admin (local E2E)', async ({ page }) => {
  setup.setTimeout(120_000);
  fs.mkdirSync(authDir, { recursive: true });

  if (fs.existsSync(authFile)) {
    const age = Date.now() - fs.statSync(authFile).mtimeMs;
    if (age < AUTH_MAX_AGE_MS) return;
  }

  await loginAsAdmin(page);
  await page.context().storageState({ path: authFile });
});
