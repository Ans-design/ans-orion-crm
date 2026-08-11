import type { Locator, Page } from '@playwright/test';

export const E2E_ADMIN = {
  email: process.env.E2E_EMAIL || 'john@doe.com',
  password: process.env.E2E_PASSWORD || 'johndoe123',
};

export const E2E_DEMO = {
  email: process.env.E2E_DEMO_EMAIL || 'demo@ansdesign.mg',
  password: process.env.E2E_DEMO_PASSWORD || 'Demo2026!',
};

/** Saisie compatible inputs React contrôlés (fill seul ne met pas toujours à jour le state). */
async function typeControlled(locator: Locator, value: string) {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 15 });
}

async function waitForSessionReady(page: Page, email: string) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const sessionMarker =
    email === E2E_ADMIN.email
      ? page.getByRole('button', { name: /admin ans/i })
      : page.getByRole('button', { name: /compte démo/i });
  await sessionMarker.waitFor({ state: 'visible', timeout: 25_000 });
}

export async function logout(page: Page) {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
}

export async function login(page: Page, email: string, password: string) {
  const quickLabel =
    email === E2E_ADMIN.email ? /admin ans/i : /compte démo/i;

  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const quickBtn = page.getByRole('button', { name: quickLabel });
    try {
      await quickBtn.waitFor({ state: 'visible', timeout: 8000 });
      await quickBtn.click();
    } catch {
      const emailField = page.getByPlaceholder('email@exemple.com');
      await emailField.waitFor({ state: 'visible', timeout: 30_000 });
      await typeControlled(emailField, email);
      await typeControlled(page.locator('input[type="password"]'), password);
      await page.getByRole('button', { name: /se connecter/i }).click();
    }
    try {
      await page.waitForURL('**/dashboard**', { timeout: 30_000 });
      await waitForSessionReady(page, email);
      return;
    } catch {
      if (attempt === 2) throw new Error(`Connexion échouée après 3 tentatives (${email})`);
      await page.waitForTimeout(2000);
    }
  }
}

export async function loginAsAdmin(page: Page) {
  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
}

export async function loginAsDemo(page: Page) {
  await login(page, E2E_DEMO.email, E2E_DEMO.password);
}
