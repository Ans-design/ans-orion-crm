import type { Locator, Page } from '@playwright/test';

/** Attend l’hydratation React (setup-status) avant saisie — évite submit HTML natif. */
export async function waitForLoginPageReady(page: Page) {
  await page.goto(`/login?_=${Date.now()}`, { waitUntil: 'domcontentloaded' });

  // Session encore active → middleware renvoie vers /dashboard : forcer logout cookie
  for (let i = 0; i < 2; i++) {
    const path = new URL(page.url()).pathname;
    if (path === '/login' || path.startsWith('/login')) break;
    await page.context().clearCookies();
    await page.goto(`/login?_=${Date.now()}&force=1`, { waitUntil: 'domcontentloaded' });
  }

  await page
    .waitForResponse((r) => r.url().includes('/api/auth/setup-status') && r.ok(), { timeout: 30_000 })
    .catch(() => {});

  const loginReady = page
    .locator('#login-id')
    .or(page.getByPlaceholder(/ADM01|email@exemple\.com/i))
    .or(page.getByRole('button', { name: /se connecter/i }))
    .or(page.getByRole('button', { name: /Connexion Admin|Connexion rapide|Admin ANS/i }));
  await loginReady.first().waitFor({ state: 'visible', timeout: 45_000 });
}

/** Champ identifiant login (matricule ou email) — UX login-id depuis refonte. */
export function loginIdentifierField(page: Page): Locator {
  return page.locator('#login-id').or(page.getByPlaceholder(/ADM01|email@exemple\.com/i));
}

export function loginPasswordField(page: Page): Locator {
  return page.locator('#login-password').or(page.locator('input[type="password"]'));
}

export async function fillLoginForm(page: Page, identifier: string, password: string) {
  const idField = loginIdentifierField(page);
  await idField.waitFor({ state: 'visible', timeout: 45_000 });
  await idField.fill(identifier);
  await loginPasswordField(page).fill(password);
}

export async function submitLoginForm(page: Page) {
  const loginCheck = page.waitForResponse((r) => r.url().includes('/api/auth/login-check'), { timeout: 30_000 });
  await page.getByRole('button', { name: /se connecter/i }).click();
  const res = await loginCheck;
  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`login-check ${res.status()}: ${body.slice(0, 200)}`);
  }
}
