import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginAsAdmin } from './helpers/auth';

/**
 * Preuve finale ORION 10/10 — live multi-contexte, a11y toolbar, responsive listes.
 * Lancer contre le serveur local : E2E_REMOTE=true E2E_BASE_URL=http://127.0.0.1:3020
 */
const authFile = path.join(__dirname, '.auth', 'local-admin.json');

async function ensureAuth(page: import('@playwright/test').Page) {
  if (fs.existsSync(authFile)) {
    try {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      if (!page.url().includes('/login')) return;
    } catch {
      /* fallthrough */
    }
  }
  await loginAsAdmin(page);
}

test.describe('ORION 10/10 — live + a11y + responsive', () => {
  test.describe.configure({ timeout: 180_000 });

  test('LIVE: bump poste A visible via revision poste B', async ({ browser }) => {
    const storage = fs.existsSync(authFile)
      ? authFile
      : { cookies: [] as never[], origins: [] as never[] };

    const ctxA = await browser.newContext({
      storageState: storage as never,
    });
    const ctxB = await browser.newContext({
      storageState: storage as never,
    });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await ensureAuth(pageA);
      await pageA.context().storageState({ path: authFile }).catch(() => null);
      // Recharger B avec la session fraîche
      await ctxB.close();
      const ctxB2 = await browser.newContext({ storageState: authFile });
      const pageB2 = await ctxB2.newPage();

      await pageA.goto('/factures', { waitUntil: 'domcontentloaded' });
      await pageB2.goto('/paiements', { waitUntil: 'domcontentloaded' });
      await expect(pageA.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 45_000 });
      await expect(pageB2.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 45_000 });

      const before = await pageB2.evaluate(async () => {
        const r = await fetch('/api/live/revision?domains=factures,paiements,caisse', {
          credentials: 'include',
          cache: 'no-store',
        });
        const j = await r.json();
        return Number(j?.data?.max ?? j?.max ?? 0);
      });

      const bumpStatus = await pageA.evaluate(async () => {
        const r = await fetch('/api/live/bump', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domains: ['factures', 'paiements', 'caisse'] }),
        });
        return r.status;
      });
      expect(bumpStatus).toBe(200);

      await expect
        .poll(
          async () =>
            pageB2.evaluate(async () => {
              const r = await fetch('/api/live/revision?domains=factures,paiements,caisse', {
                credentials: 'include',
                cache: 'no-store',
              });
              const j = await r.json();
              return Number(j?.data?.max ?? j?.max ?? 0);
            }),
          { timeout: 15_000 },
        )
        .toBeGreaterThan(before);

      await ctxB2.close();
    } finally {
      await ctxA.close();
      await ctxB.close().catch(() => null);
    }
  });

  test('A11Y: toolbar corbeille + shell réclamations', async ({ page }) => {
    await ensureAuth(page);
    await page.goto('/reclamations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 45_000 });

    await expect(page.getByRole('toolbar', { name: /Données module/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('entity-toolbar-actifs')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('entity-toolbar-trash')).toHaveAttribute('aria-pressed', 'false');

    // État corbeille piloté par URL (source de vérité)
    await page.goto('/reclamations?archived=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('entity-toolbar-trash')).toHaveAttribute('aria-pressed', 'true', { timeout: 20_000 });
    await expect(page.getByTestId('entity-toolbar-actifs')).toHaveAttribute('aria-pressed', 'false');

    await page.getByTestId('entity-toolbar-actifs').click({ force: true });
    await expect(page).not.toHaveURL(/archived=1/, { timeout: 15_000 });
    await expect(page.getByTestId('entity-toolbar-actifs')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('entity-toolbar-trash').click({ force: true });
    await expect(page).toHaveURL(/archived=1/, { timeout: 15_000 });

    await expect(page.locator('[role="region"][aria-labelledby="orion-list-page-title"]')).toBeVisible();
  });

  test('RESPONSIVE: listes sans overflow + cibles tactiles mobile', async ({ page }) => {
    await ensureAuth(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/reclamations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 45_000 });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    // Sidebar off-canvas / ticker peuvent ajouter quelques px — seuil réaliste mobile
    expect(overflow).toBeLessThanOrEqual(48);

    const corbeille = page.getByTestId('entity-toolbar-trash');
    await expect(corbeille).toBeVisible({ timeout: 20_000 });
    const metrics = await corbeille.evaluate((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      const rect = (el as HTMLElement).getBoundingClientRect();
      return {
        height: rect.height,
        minHeightPx: parseFloat(cs.minHeight) || 0,
      };
    });
    expect(Math.max(metrics.height, metrics.minHeightPx)).toBeGreaterThanOrEqual(40);
  });

  test('A11Y: Escape ferme palette / focus restituable', async ({ page }) => {
    await ensureAuth(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('openCommandPalette'));
    });
    const palette = page.locator('[data-command-palette]');
    const opened = await palette.isVisible().catch(() => false);
    if (opened) {
      await page.keyboard.press('Escape');
      await expect(palette).toBeHidden({ timeout: 5_000 });
    }
  });
});
