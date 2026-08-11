import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Pixel-perfect Studio Prix & Calculs — Tarifs par article
 * Viewport capture : 2048 × 629 (deviceScaleFactor 1)
 *
 * Route : /administration/catalogue-prix-stock?studio=prix&tab=articles
 *
 * Lancer :
 *   npx playwright test e2e/studio-prix-pixel-perfect.spec.ts --project=chromium
 *
 * Contre serveur déjà lancé (ex. :3020) :
 *   E2E_SKIP_SERVER=1 E2E_REMOTE=true E2E_BASE_URL=http://127.0.0.1:3020 \
 *     npx playwright test e2e/studio-prix-pixel-perfect.spec.ts --project=chromium
 */

const ROUTE =
  '/administration/catalogue-prix-stock?studio=prix&tab=articles';

const REF_DIR = path.join(process.cwd(), 'docs', 'ui-references');
const OUT_SHOT = path.join(REF_DIR, 'studio-prix-articles-2048x629-obtained.png');

/** Fixture visuelle isolée (prompt §15) — mock API, jamais seedée en prod. */
const VISUAL_FIXTURE_ITEMS = [
  { id: 'bn-bloc-note', label: 'Bloc-note & Agenda', family: 'notes', cat: 'Publications', mats: 2, opts: 19, price: 0, type: 'formula' },
  { id: 'cal-mural', label: 'Calendrier mural', family: 'calendrier', cat: 'Calendrier', mats: 1, opts: 13, price: 0, type: 'formula' },
  { id: 'cal-plateau', label: 'Calendrier plateau', family: 'calendrier', cat: 'Calendrier', mats: 1, opts: 8, price: 0, type: 'formula' },
  { id: 'cal-sous-main', label: 'Calendrier sous-main', family: 'calendrier', cat: 'Calendrier', mats: 1, opts: 12, price: 0, type: 'formula' },
  { id: 'chevalet-bureau', label: 'Chevalet de bureau', family: 'calendrier', cat: 'Calendrier', mats: 1, opts: 14, price: 0, type: 'formula' },
  { id: 'chevalet-table', label: 'Chevalet de table simple', family: 'calendrier', cat: 'Calendrier', mats: 1, opts: 12, price: 0, type: 'formula' },
  { id: 'marque-page', label: 'Marque-page', family: 'carterie', cat: 'Carterie', mats: 1, opts: 10, price: 450, type: 'formula' },
  { id: 'cv-standard', label: 'Carte de visite standard', family: 'carterie', cat: 'Carterie', mats: 1, opts: 4, price: 1200, type: 'direct' },
].map((row) => ({
  articleId: row.id,
  articleLabel: row.label,
  family: row.family,
  calculationType: row.type === 'formula' ? 'formula' : 'fixed',
  status: 'published',
  prixBase: row.price,
  qtyMin: 1,
  saleUnit: 'u',
  updatedAt: '2026-07-20T06:00:00.000Z',
  formulaVersions:
    row.type === 'formula'
      ? [{ version: 1, status: 'published' }]
      : [{ version: 1, status: 'published' }],
  optionGroups: Array.from({ length: Math.min(row.opts, 3) }, (_, i) => ({
    visiblePos: true,
    label: `Opt ${i + 1}`,
  })),
  _count: {
    materialPrices: row.mats,
    optionGroups: row.opts,
    stockRules: 0,
    formulaVersions: 1,
  },
}));

test.describe('Studio Prix pixel-perfect (2048×629)', () => {
  test.use({
    viewport: { width: 2048, height: 629 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'fr-FR',
  });

  test('composition Tarifs par article + screenshot compare', async ({ page }) => {
    test.setTimeout(180_000);

    await page.route('**/api/backoffice/articles**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: VISUAL_FIXTURE_ITEMS,
          profiles: VISUAL_FIXTURE_ITEMS,
          total: VISUAL_FIXTURE_ITEMS.length,
        }),
      });
    });

    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }
        /* Capture = zone CPS seule (réf. sans shell ORION) */
        .orion-sidebar,
        .orion-sidebar-v2,
        aside[aria-label="Navigation principale"],
        nav[aria-label="Navigation principale"],
        .orion-cockpit-header,
        [data-ans-talk-fab],
        .ans-talk-fab,
        button[aria-label="ANS Talk"],
        [data-floating-messagerie],
        [data-alert-ticker],
        [data-alert-ticker-spacer],
        [aria-label="Alertes opérationnelles"],
        [role="region"][aria-label*="Alertes"] {
          display: none !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          min-height: 0 !important;
          pointer-events: none !important;
          overflow: hidden !important;
        }
        .flex-1.flex.flex-col.min-w-0 {
          margin-left: 0 !important;
        }
        body { background: #f4f7fb !important; }
      `;
      document.documentElement.appendChild(style);
    });

    await page.goto(ROUTE, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined);

    // Renforce le masquage shell après hydratation
    await page.addStyleTag({
      content: `
        .orion-sidebar, .orion-sidebar-v2, .orion-cockpit-header,
        aside[aria-label="Navigation principale"],
        [data-ans-talk-fab], .ans-talk-fab, button[aria-label="ANS Talk"],
        [data-alert-ticker], [data-alert-ticker-spacer],
        [aria-label="Alertes opérationnelles"],
        [role="region"][aria-label*="Alertes"] {
          display: none !important; visibility: hidden !important;
          width: 0 !important; height: 0 !important; min-height: 0 !important;
          pointer-events: none !important;
        }
        div.flex-1.flex.flex-col.min-w-0 { margin-left: 0 !important; }
      `,
    });

    await expect(page).toHaveURL(/studio=prix/, { timeout: 60_000 });
    await expect(page).toHaveURL(/tab=articles/);

    await expect(
      page.getByRole('heading', { name: /^Articles & tarifs$/i }),
    ).toBeVisible({ timeout: 90_000 });

    const domains = page.getByRole('navigation', {
      name: /Studios Catalogue Prix Stock/i,
    });
    await expect(domains).toBeVisible();
    await expect(domains.getByRole('button', { name: /^Vue d’ensemble/i })).toHaveCount(0);
    await expect(domains.getByRole('button', { name: /^Matières$/i })).toBeVisible();
    await expect(
      domains.getByRole('button', { name: /^Articles & tarifs/i }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(domains.getByRole('button', { name: /^Formules & moteurs/i })).toBeVisible();
    await expect(domains.getByRole('button', { name: /^Données & contrôle/i })).toHaveCount(0);

    const adminNav = page.locator('.orion-admin-macro-nav').first();
    await expect(adminNav.getByText("Vue d'ensemble", { exact: true })).toBeVisible();

    const pills = page.getByRole('tablist', { name: /Sous-sections prix/i });
    await expect(pills.getByRole('tab', { name: /^Tarifs$/i })).toBeVisible();
    await expect(pills.getByRole('tab', { name: /Paliers de remise/i })).toBeVisible();

    await expect(
      page.getByRole('tablist', { name: /Sections Studio Prix/i }),
    ).toHaveCount(0);

    // CpsSourcesBar retiré du Studio Prix (composant conservé, non rendu)
    await expect(
      page.getByRole('status', { name: /Sources tarifaires|Source de tarification/i }),
    ).toHaveCount(0);

    await expect(page.locator('.acat-search-input')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /^Tous$/i }).first()).toBeVisible();
    await expect(page.getByText(/\d+\s+actifs/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/\d+\s+formules/i).first()).toBeVisible();
    await expect(page.locator('.acat-toolbar__stats').getByText(/inactivés/i)).toHaveCount(0);

    const table = page.locator('.acat-dense-table');
    await expect(table).toBeVisible({ timeout: 90_000 });
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.acat-chip-skeleton')).toHaveCount(0, { timeout: 90_000 });
    for (const col of [
      'Article',
      'Catégorie',
      'Type tarif',
      'Prix base',
      'Formule',
      'Matières',
      'Options',
      'Validation',
      'POS',
      'Action',
    ]) {
      await expect(table.locator('thead').getByText(col, { exact: true })).toBeVisible();
    }

    fs.mkdirSync(REF_DIR, { recursive: true });

    const hub = page.locator('.cps-hub').first();
    await expect(hub).toBeVisible();
    await hub.screenshot({
      path: OUT_SHOT,
      animations: 'disabled',
      caret: 'hide',
    });

    // Snapshot Playwright (régression vs baseline locale)
    await expect(hub).toHaveScreenshot('studio-prix-articles-2048x629-hub.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.03,
    });
  });
});
