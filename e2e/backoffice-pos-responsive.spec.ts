/**
 * Responsive POS essentiel — viewports + dark mode / focus / erreur.
 */
import { test, expect } from '@playwright/test';
import { ensureAdminSession } from './helpers/auth';
import { ensurePosClientSelected } from './helpers/commercial';
import {
  E2E_BO_POS_ARTICLE_ID,
  ensureE2eDraftTariff,
  extractUnitPrice,
  posPricePreview,
  publishE2eArticle,
} from './helpers/bo-pos-evidence';

const VIEWPORTS = [
  { name: 'phone-narrow', width: 320, height: 640 },
  { name: 'phone-standard', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
] as const;

test.describe('ANO-BO-POS responsive POS', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await ensureAdminSession(page);
    await ensureE2eDraftTariff(page, { unitPriceAr: 12_500 });
    await publishE2eArticle(page);
    await page.close();
  });

  for (const vp of VIEWPORTS) {
    test(`POS ${vp.name} ${vp.width}×${vp.height} — catalogue + fiche + dark`, async ({ page }) => {
      // Session d’abord en viewport projet (desktop), puis resize — évite re-login sur shell mobile
      await ensureAdminSession(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await ensurePosClientSelected(page);

      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/pos', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: /catalogue pos/i }).or(page.getByLabel(/Rechercher un article/i)),
      ).toBeVisible({ timeout: 25_000 });

      const search = page.getByLabel(/Rechercher un article/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('E2E');
      }

      await page.goto(`/pos/${E2E_BO_POS_ARTICLE_ID}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/E2E Preuve|Backoffice POS|ajouter au panier|prix/i).first()).toBeVisible({
        timeout: 25_000,
      });

      const addBtn = page.getByRole('button', { name: /ajouter au panier/i });
      if (await addBtn.isVisible().catch(() => false)) {
        const disabled = await addBtn.isDisabled().catch(() => false);
        if (disabled) {
          await expect(addBtn).toBeDisabled();
        } else {
          await addBtn.focus();
          await expect(addBtn).toBeFocused();
        }
      } else if (await search.isVisible().catch(() => false)) {
        await search.focus();
        await expect(search).toBeFocused();
      }

      const preview = await posPricePreview(page, { qty: 1 });
      expect(extractUnitPrice(preview.body)).toBe(12_500);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(8);
    });
  }

  test('erreur métier — article inconnu affiche un état d’erreur', async ({ page }) => {
    await ensureAdminSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await ensurePosClientSelected(page);
    await page.goto('/pos/e2e-article-inexistant-xyz', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/introuvable|non trouvé|non disponible|erreur|404|pas trouvé/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
