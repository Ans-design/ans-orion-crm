/**
 * Smoke UX professionnel — routes critiques, dark, responsive, clavier.
 * Critères mesurables (pas de note subjective).
 */
import { test, expect } from '@playwright/test';
import { ensureAdminSession } from './helpers/auth';

const CRITICAL = [
  '/dashboard',
  '/clients',
  '/pos',
  '/devis',
  '/commandes',
  '/paiements',
  '/production',
  '/stock',
  '/messagerie',
] as const;

test.describe('UX professionnel — routes critiques', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  for (const path of CRITICAL) {
    test(`${path} — charge sans overflow horizontal (phone 390)`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      expect(
        overflow.scrollWidth,
        `${path}: scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 2);
    });
  }

  test('dashboard — meta période / rafraîchissement + dark', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('dashboard-kpi-meta')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('dashboard-kpi-meta')).toContainText(/Période KPI/i);

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    const bg = await page.evaluate(() => {
      const el = document.querySelector('.dashboard-full') ?? document.body;
      return getComputedStyle(el).backgroundColor;
    });
    // Fond sombre attendu (pas blanc opaque)
    expect(bg).not.toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
  });

  test('navigation clavier — focus visible sur refresh dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Cockpit/i })).toBeVisible({ timeout: 45_000 });

    // Tab jusqu’à un contrôle interactif focusable
    let focusedTag = '';
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press('Tab');
      focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? '');
      if (focusedTag === 'BUTTON' || focusedTag === 'A' || focusedTag === 'INPUT') break;
    }
    expect(['BUTTON', 'A', 'INPUT', 'SELECT']).toContain(focusedTag);

    const hasRing = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const s = getComputedStyle(el);
      return Boolean(s.boxShadow && s.boxShadow !== 'none') || s.outlineStyle !== 'none';
    });
    expect(hasRing).toBe(true);
  });

  test('redirect /admin → /administration (query préservée)', async ({ page }) => {
    await page.goto('/admin?from=ux-test', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/administration\//);
    expect(page.url()).toContain('from=ux-test');
  });
});
