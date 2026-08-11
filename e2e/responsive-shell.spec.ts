import { test, expect } from '@playwright/test';
import { login, E2E_ADMIN, E2E_DEMO } from './helpers/auth';

/**
 * Amorçage E2E-RES-01…08 / 30 — shell PC / tablette / smartphone.
 */
const EMAIL = process.env.E2E_EMAIL || E2E_ADMIN.email;
const PASS = process.env.E2E_PASSWORD || E2E_ADMIN.password;

async function ensureLogin(page: import('@playwright/test').Page) {
  try {
    await login(page, EMAIL, PASS);
  } catch {
    await login(page, E2E_DEMO.email, E2E_DEMO.password);
  }
}

test.describe('V15 responsive shell', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await ensureLogin(page);
  });

  test('RES-overflow: no horizontal overflow on dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('RES-chrome: shell by viewport', async ({ page }, testInfo) => {
    await page.goto('/commandes', { waitUntil: 'domcontentloaded' });
    const project = testInfo.project.name;

    if (project === 'smartphone') {
      await expect(page.getByRole('navigation', { name: /navigation principale mobile/i })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('aside[aria-label="Navigation principale"]')).toBeHidden();
    }
    if (project === 'tablet') {
      await expect(page.getByRole('navigation', { name: /navigation tablette/i })).toBeVisible({ timeout: 20_000 });
    }
    if (project === 'chromium') {
      await expect(page.locator('aside[aria-label="Navigation principale"]')).toBeVisible({ timeout: 20_000 });
    }
  });

  test('RES-sync: commandes sync badge', async ({ page }) => {
    await page.goto('/commandes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-sync-status]').first()).toBeVisible({ timeout: 30_000 });
  });

  test('RES-07: command palette opens', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Rechercher/i }).first()).toBeVisible({ timeout: 20_000 });
    // Lazy CommandPalette : retry jusqu’à ce que le listener soit branché
    let opened = false;
    for (let i = 0; i < 12 && !opened; i++) {
      await page.evaluate(() => {
        (window as Window & { __orionCmdPalettePending?: boolean }).__orionCmdPalettePending = true;
        window.dispatchEvent(new Event('openCommandPalette'));
      });
      opened = await page.locator('[data-command-palette]').isVisible().catch(() => false);
      if (!opened) await page.waitForTimeout(400);
    }
    await expect(page.locator('[data-command-palette]')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Escape');
  });

  test('RES-08: notifications popover bounded', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Notifications/i })).toBeVisible({ timeout: 20_000 });
    let opened = false;
    for (let i = 0; i < 12 && !opened; i++) {
      await page.evaluate(() => {
        (window as Window & { __orionNotifPending?: boolean }).__orionNotifPending = true;
        window.dispatchEvent(new Event('openNotifications'));
      });
      opened = await page.locator('[data-orion-notif-panel]').isVisible().catch(() => false);
      if (!opened) await page.waitForTimeout(400);
    }
    const panel = page.locator('[data-orion-notif-panel]');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    const box = await panel.boundingBox();
    const vw = page.viewportSize()?.width ?? 1280;
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(-4);
      expect(box.x + box.width).toBeLessThanOrEqual(vw + 4);
    }
    await page.keyboard.press('Escape');
  });

  test('RES-05/30: phone bottom nav + FAB no overlap', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'smartphone', 'phone only');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: /navigation principale mobile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Plus de modules/i })).toBeVisible();

    await page.waitForTimeout(2800);
    const overlap = await page.evaluate(() => {
      const navEl = document.querySelector('nav[aria-label="Navigation principale mobile"]') as HTMLElement | null;
      const fab = document.querySelector('.talk-floating-bubble-btn') as HTMLElement | null;
      if (!navEl) return { ok: false, reason: 'no-nav' };
      if (!fab) return { ok: true, reason: 'fab-not-ready' };
      const a = navEl.getBoundingClientRect();
      const b = fab.getBoundingClientRect();
      const intersects = !(b.bottom < a.top || b.top > a.bottom || b.right < a.left || b.left > a.right);
      return { ok: !intersects, reason: intersects ? 'fab-nav-overlap' : 'clear' };
    });
    expect(overlap.ok, overlap.reason).toBe(true);
  });

  test('RES-sticky: workspace sticky bars on phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'smartphone', 'phone only');
    // Workspaces Mon espace (accessibles démo/admin) — pas /livraisons si rôle limité
    await page.goto('/workspace/magasin', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-orion-sticky-action]')).toBeVisible({ timeout: 20_000 });
    await page.goto('/workspace/commercial', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-orion-sticky-action]')).toBeVisible({ timeout: 20_000 });
  });

  test('RES-sticky-oublis: devis + clients sticky on phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'smartphone', 'phone only');
    await page.goto('/devis', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-orion-sticky-action]')).toBeVisible({ timeout: 25_000 });
    await page.goto('/clients', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-orion-sticky-action]')).toBeVisible({ timeout: 25_000 });
  });

  test('RES-sticky-hub: commandes sticky on phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'smartphone', 'phone only');
    // /bat peut être 403 selon rôle — hub commande suffit pour sticky registry
    await page.goto('/commandes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-orion-sticky-action]')).toBeVisible({ timeout: 25_000 });
  });

  test('RES-BAT-320: public BAT page no overflow at 320px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'smartphone', 'phone only');
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/bat/valider/e2e-token-inexistant', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
