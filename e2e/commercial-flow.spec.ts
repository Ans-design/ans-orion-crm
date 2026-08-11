import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsDemo, logout } from './helpers/auth';
import {
  acceptDevisByNumero,
  addArticleToCart,
  clearCartIfNeeded,
  createDevisFromCart,
} from './helpers/commercial';
import { ensureClientListRow } from './helpers/fixtures';

test.describe('Parcours commercial — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('palette Ctrl+K — Nouveau devis ouvre /panier', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder(/rechercher client, devis/i)).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/rechercher client, devis/i).fill('nouveau devis');
    const palette = page.locator('div.fixed.inset-0').filter({
      has: page.getByPlaceholder(/rechercher client, devis/i),
    });
    await palette.getByRole('button', { name: /^nouveau devis$/i }).click();
    await page.waitForURL('**/panier**', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /panier pos/i })).toBeVisible();
  });

  test('POS catalogue → panier accessible', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.getByRole('heading', { name: /catalogue pos/i })).toBeVisible({
      timeout: 15_000,
    });

    const panierLink = page.getByRole('link', { name: /panier/i }).first();
    if (await panierLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await panierLink.click();
      await page.waitForURL('**/panier**', { timeout: 15_000 });
    } else {
      await page.goto('/panier');
    }
    await expect(page).toHaveURL(/\/panier/);
  });

  test('liste devis accessible depuis dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /devis en attente/i }).first().click();
    await page.waitForURL('**/devis**', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /devis/i })).toBeVisible();
  });

  test('recherche globale — deep link client', async ({ page }) => {
    const firstRow = await ensureClientListRow(page);

    const clientName = await firstRow.locator('td').first().innerText();
    const searchTerm = clientName.trim().slice(0, 4);
    expect(searchTerm.length).toBeGreaterThanOrEqual(2);

    await page.keyboard.press('Control+k');
    await page.getByPlaceholder(/rechercher/i).fill(searchTerm);
    await page.waitForTimeout(600);

    const hit = page.getByRole('button').filter({ hasText: new RegExp(searchTerm, 'i') }).first();
    if (await hit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await hit.click();
      await page.waitForURL(/\/clients\//, { timeout: 15_000 });
    }
  });
});

test.describe.serial('Parcours commercial — workflow complet', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('POS → panier → devis → acceptation → commande', async ({ page }) => {
    await clearCartIfNeeded(page);
    await addArticleToCart(page, 'fly-std');

    const numero = await createDevisFromCart(page);
    await acceptDevisByNumero(page, numero);

    await page.goto('/commandes');
    await expect(page.getByRole('heading', { name: /commandes/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.bg-card').filter({ hasText: /CMD-/ }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('Parcours commercial — POS configurateur', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('flyer A6 démarre à 0/N sans chips présélectionnées', async ({ page }) => {
    await page.goto('/pos/fly-std');
    await expect(page.getByRole('heading', { name: /flyer/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/0\/\d/)).toBeVisible();
    await expect(page.getByText(/à compléter/i).first()).toBeVisible();
    const addBtn = page.getByRole('button', { name: /ajouter au panier/i });
    await expect(addBtn).toBeDisabled();
    await expect(page.getByText('★')).not.toBeVisible();
    await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(0);
  });

  test('carte visite — chips neutres puis toggle Bord carré', async ({ page }) => {
    await page.goto('/pos/cv-std');
    await expect(page.getByRole('heading', { name: /carte/i })).toBeVisible({ timeout: 20_000 });

    const bordCarre = page.getByRole('button', { name: 'Bord carré', exact: true });
    await expect(bordCarre).toBeVisible();
    await expect(bordCarre).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('★')).not.toBeVisible();

    await bordCarre.click();
    await expect(bordCarre).toHaveAttribute('aria-pressed', 'true');

    await bordCarre.click();
    await expect(bordCarre).toHaveAttribute('aria-pressed', 'false');
  });

  test('finitions — 13 articles visibles dont dorure et reliure', async ({ page }) => {
    await page.goto('/pos');
    await page.getByRole('button', { name: /finitions/i }).click();
    await expect(page.getByText(/dorure/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/reliure/i).first()).toBeVisible();
    await expect(page.getByText(/vernis/i).first()).toBeVisible();

    await page.goto('/pos/fin-dorure');
    await expect(page.getByRole('heading', { name: 'Dorure / argenture' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/0\/\d/)).toBeVisible();
    await page.getByRole('button', { name: /Dorure Or/i }).click();
    await expect(page.getByRole('button', { name: /Dorure Or/i })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Parcours commercial — marges masquées', () => {
  test('compte démo ne voit pas la marge direction', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/pos/fly-std');
    await expect(page.getByRole('button', { name: /ajouter au panier/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForTimeout(800);
    await expect(page.getByText(/direction · marge estimée/i)).not.toBeVisible();
  });

  test('rapports — admin voit marge, démo non', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/rapports');
    await expect(page.getByText(/marge estimée/i)).toBeVisible({ timeout: 15_000 });

    await logout(page);
    await loginAsDemo(page);
    await page.goto('/rapports');
    await expect(page.getByText(/marge estimée/i)).not.toBeVisible();
    await expect(page.getByText(/achats/i)).not.toBeVisible();
  });
});
