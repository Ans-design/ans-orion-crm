import type { Page } from '@playwright/test';
import './env';
import { fillLoginForm, submitLoginForm, waitForLoginPageReady } from './login-form';

export const E2E_ADMIN = {
  email: process.env.E2E_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@example.local',
  /** SEC-10 : pas de secret hardcodé — définir E2E_PASSWORD / SEED_ADMIN_PASSWORD. */
  password: process.env.E2E_PASSWORD || process.env.SEED_ADMIN_PASSWORD || '',
};

const isRemoteE2E = process.env.E2E_REMOTE === 'true';

export const E2E_DEMO = {
  email: process.env.E2E_DEMO_EMAIL || process.env.SEED_DEMO_EMAIL || 'demo@example.local',
  password: process.env.E2E_DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_PASSWORD || '',
};

export { fillLoginForm, loginIdentifierField, loginPasswordField, submitLoginForm, waitForLoginPageReady } from './login-form';

async function waitForAuthenticatedLanding(page: Page) {
  await page.waitForURL(
    (url) => {
      const p = new URL(url).pathname;
      return p !== '/login' && !p.startsWith('/login') && p !== '/non-autorise';
    },
    { timeout: 45_000 },
  );
}

async function waitForSessionReady(page: Page, email: string, landingPath = '/dashboard') {
  const candidates = Array.from(
    new Set([landingPath, '/clients', '/pos', '/commandes', '/workspace/commercial', '/dashboard']),
  );
  let lastUrl = '';
  for (const path of candidates) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    lastUrl = page.url();
    const p = new URL(lastUrl).pathname;
    if (p === '/login' || p.startsWith('/login') || p === '/non-autorise') continue;

    const shell = page
      .getByRole('complementary', { name: /navigation principale/i })
      .or(page.locator('aside[aria-label="Navigation principale"]'))
      .or(page.getByRole('navigation', { name: /navigation principale mobile/i }))
      .or(page.getByRole('navigation', { name: /navigation tablette/i }))
      .or(page.locator('[data-orion-tablet-rail]'))
      .or(page.locator('button.orion-sb-universe-btn').first())
      .or(page.getByRole('button', { name: /Admin ANS|compte démo|Direction|Commercial|Production|Finance|Caisse|Lecture/i }))
      .or(page.locator('main').first());
    try {
      await shell.first().waitFor({ state: 'visible', timeout: 12_000 });
      return;
    } catch {
      /* essayer la route suivante */
    }
  }
  throw new Error(`Session non prête après login (${email}) — shell introuvable (dernier: ${lastUrl})`);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
  await page.goto(`/login?_=${Date.now()}&logout=1`, { waitUntil: 'domcontentloaded' });
  if (!new URL(page.url()).pathname.includes('/login')) {
    await page.context().clearCookies();
    await page.goto(`/login?_=${Date.now()}&logout=2`, { waitUntil: 'domcontentloaded' });
  }
}

export async function login(page: Page, email: string, password: string, landingPath = '/dashboard') {
  await page.context().clearCookies();

  const isAdminEmail = email === E2E_ADMIN.email || email === 'john@doe.com';
  const isDemoEmail = email === E2E_DEMO.email || /demo@/i.test(email);
  const quickLabel = isAdminEmail ? 'Admin ANS' : isDemoEmail ? /compte démo/i : null;

  for (let attempt = 0; attempt < 3; attempt++) {
    await waitForLoginPageReady(page);
    // Quick login uniquement pour comptes démo/admin connus — jamais pour matricules V29
    const allowQuick =
      Boolean(quickLabel)
      && (!isRemoteE2E || /127\.0\.0\.1|localhost/i.test(process.env.E2E_BASE_URL || ''));
    if (allowQuick && quickLabel) {
      const quickBtn = page.getByRole('button', {
        name: quickLabel,
        exact: isAdminEmail,
      });
      try {
        await quickBtn.waitFor({ state: 'visible', timeout: 8000 });
        await quickBtn.click();
        try {
          await waitForAuthenticatedLanding(page);
          await waitForSessionReady(page, email, landingPath);
          return;
        } catch {
          /* formulaire */
        }
      } catch {
        /* pas de quick login */
      }
    }
    await fillLoginForm(page, email, password);
    await submitLoginForm(page);
    try {
      await waitForAuthenticatedLanding(page);
      await waitForSessionReady(page, email, landingPath);
      return;
    } catch {
      if (attempt === 2) throw new Error(`Connexion échouée après 3 tentatives (${email})`);
      await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => null);
    }
  }
}

export async function ensureAdminSession(page: Page) {
  if (isRemoteE2E) {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await waitForSessionReady(page, E2E_ADMIN.email);
    return;
  }
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  // Session cookie valide suffit (viewport mobile : sidebar souvent hors écran)
  const sessionRes = await page.request.get('/api/auth/session');
  const session = (await sessionRes.json().catch(() => ({}))) as { user?: { id?: string; email?: string; role?: string } };
  if (session.user?.id || session.user?.email) {
    const path = new URL(page.url()).pathname;
    if (path !== '/login' && !path.startsWith('/login') && path !== '/non-autorise') {
      return;
    }
  }
  if (page.url().includes('/dashboard')) {
    try {
      await waitForSessionReady(page, E2E_ADMIN.email);
      return;
    } catch {
      /* session expirée — login complet */
    }
  }
  await loginAsAdmin(page);
}

export async function loginAsAdmin(page: Page) {
  await page.context().clearCookies();
  await waitForLoginPageReady(page);

  // Compte seedé E2E / démo local — source de vérité (évite V29 → /non-autorise si MDP JSON drift)
  const seedEmail =
    process.env.E2E_ADMIN_EMAIL
    || process.env.SEED_ADMIN_EMAIL
    || process.env.LOCAL_ADMIN_LOGIN
    || process.env.E2E_EMAIL
    || process.env.DEMO_ADMIN_EMAIL
    || '';
  const seedPassword =
    process.env.E2E_ADMIN_PASSWORD
    || process.env.SEED_ADMIN_PASSWORD
    || process.env.LOCAL_ADMIN_PASSWORD
    || process.env.E2E_PASSWORD
    || process.env.DEMO_ADMIN_PASSWORD
    || E2E_ADMIN.password
    || '';
  if (seedEmail && seedPassword) {
    await login(page, seedEmail, seedPassword);
    return;
  }

  const allowQuick =
    !isRemoteE2E || /127\.0\.0\.1|localhost/i.test(process.env.E2E_BASE_URL || '');
  if (allowQuick) {
    // UI actuelle : cartes profil V29 (« Connexion Admin (ADM01) ») ou legacy « Admin ANS »
    const candidates = [
      page.getByRole('button', { name: /Connexion Admin \(ADM01\)/i }),
      page.getByRole('button', { name: /Connexion Direction \(DIRECTEUR\)/i }),
      page.getByRole('button', { name: 'Admin ANS', exact: true }),
      page.getByRole('button', { name: 'Connexion rapide', exact: true }),
    ];
    for (const btn of candidates) {
      if (await btn.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await btn.click();
        try {
          await waitForAuthenticatedLanding(page);
          await waitForSessionReady(page, 'admin');
          return;
        } catch {
          /* essai suivant — revenir au login */
          await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => null);
        }
      }
    }
  }

  const { getOrionV29Accounts } = await import('@/lib/orion-v29-accounts');
  const accounts = getOrionV29Accounts();
  for (const mat of ['DIRECTEUR', 'DIR01', 'ADM01'] as const) {
    if (accounts.some((a) => a.matricule === mat && a.password)) {
      await loginAsV29(page, mat);
      return;
    }
  }

  throw new Error(
    'loginAsAdmin: définir E2E_EMAIL+E2E_PASSWORD (ou SEED_ADMIN_*) — aucun compte admin disponible',
  );
}

export async function loginAsDemo(page: Page) {
  await login(page, E2E_DEMO.email, E2E_DEMO.password);
}

/** Connexion compte v29 (matricule ou email). */
export async function loginAsV29(page: Page, matricule: string) {
  const { getOrionV29Accounts } = await import('@/lib/orion-v29-accounts');
  const acc = getOrionV29Accounts().find((a) => a.matricule === matricule.toUpperCase());
  if (!acc) {
    throw new Error(
      `Compte v29 inconnu ou sans mot de passe env: ${matricule} (définir ORION_V29_PASSWORDS_JSON)`,
    );
  }
  // Homes sans import role-registry (alias @/ fragile dans le worker Playwright)
  const homeByRole: Record<string, string> = {
    commercial: '/workspace/commercial',
    lecture: '/dashboard',
    production: '/workspace/production',
    finance: '/workspace/finance',
    caisse: '/caisse',
    admin: '/dashboard',
    manager: '/dashboard',
  };
  const home = homeByRole[acc.role] || '/clients';
  await login(page, acc.matricule, acc.password, home);
}

export async function loginAsCommercial(page: Page) {
  await loginAsV29(page, 'COM01');
}

export async function loginAsProduction(page: Page) {
  await loginAsV29(page, 'OPE01');
}

export async function loginAsCaisse(page: Page) {
  await loginAsV29(page, 'CAISSE01');
}

export async function loginAsFinance(page: Page) {
  await loginAsV29(page, 'FIN01');
}

export async function loginAsLecture(page: Page) {
  await loginAsV29(page, 'LEC01');
}
