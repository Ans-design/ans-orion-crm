#!/usr/bin/env node
/**
 * Audit authentifié de la version Vercel ANS ORION.
 * Usage : npm run audit:vercel
 * Config : .env.audit.local (voir .env.audit.local.example)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env.audit.local') });

const BASE_URL = (process.env.AUDIT_BASE_URL || '').replace(/\/$/, '');
const LOGIN_EMAIL = process.env.AUDIT_LOGIN_EMAIL?.trim();
const LOGIN_PASSWORD = process.env.AUDIT_LOGIN_PASSWORD?.trim();

const SCREENSHOT_DIR = path.join(ROOT, 'audit-screenshots');
const REPORT_PATH = path.join(ROOT, 'docs', 'VERCEL_AUTH_AUDIT.md');

/** Routes demandées dans le prompt (visitées telles quelles). */
const REQUESTED_ROUTES = [
  '/',
  '/dev-preview',
  '/cockpit',
  '/crm/clients',
  '/catalogue-pos',
  '/panier-devis',
  '/devis',
  '/commandes',
  '/communication/ans-talk',
  '/administration/backoffice',
  '/finance/paiements',
  '/finance/factures',
  '/production',
  '/stock',
  '/logistique',
  '/rh/equipements',
];

/** Routes canoniques applicatives (modules réels). */
const CANONICAL_ROUTES = [
  '/dashboard',
  '/clients',
  '/pos',
  '/panier',
  '/devis',
  '/commandes',
  '/messagerie',
  '/administration/vue-ensemble',
  '/paiements',
  '/factures',
  '/production',
  '/stock',
  '/livraisons',
  '/rh/equipements',
  '/rh/paie',
  '/rapports',
  '/machines',
  '/planning',
];

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
};

function slug(route) {
  return route.replace(/^\//, '').replace(/\//g, '_') || 'root';
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDirs() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
}

function assertEnv() {
  if (!BASE_URL) throw new Error('AUDIT_BASE_URL manquant dans .env.audit.local');
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    throw new Error('AUDIT_LOGIN_EMAIL et AUDIT_LOGIN_PASSWORD requis dans .env.audit.local');
  }
}

async function launchBrowser() {
  const attempts = [{}, { channel: 'msedge' }, { channel: 'chrome' }];
  let last;
  for (const opts of attempts) {
    try {
      return await chromium.launch({ headless: true, ...opts });
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

function attachCollectors(page, state) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      state.consoleErrors.push({
        text: msg.text(),
        url: page.url(),
        at: nowIso(),
      });
    }
  });

  page.on('pageerror', (err) => {
    state.consoleErrors.push({
      text: `pageerror: ${err.message}`,
      url: page.url(),
      at: nowIso(),
    });
  });

  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    const entry = { url, status, pageUrl: page.url(), at: nowIso() };

    if (status >= 400) {
      state.failedResponses.push(entry);
    }

    if (url.includes('/_next/static') && status >= 400) {
      state.chunkErrors.push(entry);
    }

    if (url.includes('/api/') && status >= 400) {
      state.apiErrors.push(entry);
    }
  });

  page.on('requestfailed', (req) => {
    state.requestFailures.push({
      url: req.url(),
      failure: req.failure()?.errorText || 'unknown',
      pageUrl: page.url(),
      at: nowIso(),
    });
  });
}

async function login(page, state) {
  const loginResult = {
    success: false,
    startedAt: nowIso(),
    finalUrl: '',
    error: null,
  };

  try {
    await page.goto(`${BASE_URL}/login?_=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page
      .waitForResponse((r) => r.url().includes('/api/auth/setup-status') && r.ok(), { timeout: 60_000 })
      .catch(() => {});

    const idField = page.locator('#login-id').or(page.getByPlaceholder(/ADM01|email@exemple\.com/i));
    await idField.waitFor({ state: 'visible', timeout: 45_000 });
    await idField.fill(LOGIN_EMAIL);
    await page.locator('#login-password').or(page.locator('input[type="password"]')).fill(LOGIN_PASSWORD);

    const loginCheck = page.waitForResponse((r) => r.url().includes('/api/auth/login-check'), { timeout: 45_000 });
    await page.getByRole('button', { name: /se connecter/i }).click();
    const checkRes = await loginCheck;
    if (!checkRes.ok()) {
      throw new Error(`login-check HTTP ${checkRes.status()}`);
    }

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 90_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    const sessionRes = await page.request.get(`${BASE_URL}/api/auth/session`);
    const sessionJson = await sessionRes.json().catch(() => ({}));
    if (!sessionJson?.user) {
      throw new Error('Session API vide après connexion');
    }

    loginResult.success = true;
    loginResult.finalUrl = page.url();
    loginResult.user = sessionJson.user.email || sessionJson.user.name;
  } catch (err) {
    loginResult.error = err instanceof Error ? err.message : String(err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-login-failed.png'), fullPage: true }).catch(() => {});
  }

  loginResult.endedAt = nowIso();
  state.login = loginResult;
  return loginResult.success;
}

async function auditRoute(page, route, state, opts = {}) {
  const { label = route, viewport = 'desktop', theme = null, suffix = '' } = opts;
  const result = {
    route,
    label,
    viewport,
    theme,
    httpStatus: null,
    finalUrl: '',
    title: '',
    ok: false,
    issues: [],
    screenshot: null,
    visitedAt: nowIso(),
  };

  try {
    if (theme) {
      await page.evaluate((t) => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(t);
        localStorage.setItem('theme', t);
      }, theme);
    }

    const response = await page.goto(`${BASE_URL}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    result.httpStatus = response?.status() ?? null;
    result.finalUrl = page.url();

    await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {});
    await page.waitForTimeout(1200);

    result.title = await page.title();

    if (result.httpStatus === 404) {
      result.issues.push('HTTP 404');
    }
    if (result.finalUrl.includes('/login')) {
      result.issues.push('Redirigé vers /login (session perdue ou accès refusé)');
    }
    if (result.finalUrl.includes('/non-autorise')) {
      result.issues.push('Accès non autorisé pour ce rôle');
    }

    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/application error|something went wrong|erreur critique/i.test(bodyText)) {
      result.issues.push('Message d’erreur applicatif visible');
    }

    const fileName = `${String(state.screenshotIndex).padStart(2, '0')}-${slug(label)}${suffix ? `-${suffix}` : ''}-${viewport}.png`;
    state.screenshotIndex += 1;
    const shotPath = path.join(SCREENSHOT_DIR, fileName);
    await page.screenshot({ path: shotPath, fullPage: true });
    result.screenshot = `audit-screenshots/${fileName}`;

    result.ok =
      result.issues.length === 0 &&
      result.httpStatus !== null &&
      result.httpStatus < 400 &&
      !result.finalUrl.includes('/login');
  } catch (err) {
    result.issues.push(err instanceof Error ? err.message : String(err));
    const fileName = `${String(state.screenshotIndex).padStart(2, '0')}-${slug(label)}-error-${viewport}.png`;
    state.screenshotIndex += 1;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true }).catch(() => {});
    result.screenshot = `audit-screenshots/${fileName}`;
  }

  state.pages.push(result);
  return result;
}

async function auditSidebar(page, state) {
  const sidebar = { expanded: null, collapsed: null, issues: [] };

  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {});

  const nav = page.locator('aside.orion-sidebar[aria-label*="Navigation principale"]');
  if (!(await nav.isVisible().catch(() => false))) {
    sidebar.issues.push('Sidebar desktop non visible sur /dashboard');
  } else {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '90-sidebar-expanded.png'), fullPage: true });
    sidebar.expanded = 'audit-screenshots/90-sidebar-expanded.png';

    const collapseBtn = page.getByRole('button', { name: /réduire la sidebar/i });
    if (await collapseBtn.isVisible().catch(() => false)) {
      await collapseBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '91-sidebar-collapsed.png'), fullPage: true });
      sidebar.collapsed = 'audit-screenshots/91-sidebar-collapsed.png';

      const mini = page.locator('.orion-sidebar-mini');
      if (!(await mini.isVisible().catch(() => false))) {
        sidebar.issues.push('Classe orion-sidebar-mini absente après réduction');
      }
    } else {
      sidebar.issues.push('Bouton « Réduire la sidebar » introuvable');
    }
  }

  state.sidebar = sidebar;
}

async function auditThemes(page, state) {
  const themes = { light: null, dark: null, issues: [] };
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  const themeBtn = page.getByRole('button', { name: /thème/i });
  if (!(await themeBtn.isVisible().catch(() => false))) {
    themes.issues.push('Bouton thème (topbar) non visible');
    state.themes = themes;
    return;
  }

  for (const mode of ['light', 'dark']) {
    await page.evaluate((t) => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(t);
      localStorage.setItem('theme', t);
    }, mode);
    await page.waitForTimeout(800);
    const shot = `audit-screenshots/92-theme-${mode}-dashboard.png`;
    await page.screenshot({ path: path.join(ROOT, shot), fullPage: true });
    themes[mode] = shot;

    const contrastIssues = await page.evaluate(() => {
      const problems = [];
      const isDark = document.documentElement.classList.contains('dark');
      const samples = document.querySelectorAll('main h1, main h2, main p, .orion-sidebar a, table td');
      for (const el of samples) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) continue;
        const text = (el.textContent || '').trim();
        if (!text || text.length > 120) continue;
        const rgb = cs.color.match(/\d+/g);
        if (!rgb || rgb.length < 3) continue;
        const [r, g, b] = rgb.map(Number);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (!isDark && lum > 0.72) {
          problems.push(`Texte trop clair (${cs.color}): « ${text.slice(0, 40)}… »`);
        }
        if (isDark && lum < 0.35) {
          problems.push(`Texte trop sombre en mode sombre (${cs.color}): « ${text.slice(0, 40)}… »`);
        }
      }
      return problems.slice(0, 8);
    });

    if (contrastIssues.length) {
      themes.issues.push(...contrastIssues.map((m) => `[${mode}] ${m}`));
    }
  }

  state.themes = themes;
}

async function auditResponsive(page, state) {
  const responsive = { mobile: [], issues: [] };
  const sampleRoutes = ['/dashboard', '/clients', '/pos', '/messagerie'];

  await page.setViewportSize(VIEWPORTS.mobile);
  for (const route of sampleRoutes) {
    const res = await auditRoute(page, route, state, {
      label: route,
      viewport: 'mobile',
      suffix: 'responsive',
    });
    responsive.mobile.push(res);
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
    if (hasHorizontalOverflow) {
      responsive.issues.push(`Scroll horizontal sur mobile : ${route}`);
    }
  }

  state.responsive = responsive;
}

function dedupeByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.url}|${item.status ?? ''}|${item.text ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildReport(state) {
  const pagesOk = state.pages.filter((p) => p.ok);
  const pagesBroken = state.pages.filter((p) => !p.ok);

  const networkErrors = dedupeByUrl([
    ...state.failedResponses,
    ...state.requestFailures.map((r) => ({ url: r.url, status: 'failed', pageUrl: r.pageUrl, failure: r.failure })),
  ]);

  const consoleErrors = dedupeByUrl(state.consoleErrors.map((e) => ({ ...e, url: e.url, status: 'console' })));

  const uxIssues = [];
  for (const p of state.pages) {
    if (p.finalUrl !== `${BASE_URL}${p.route}` && !p.finalUrl.includes('/non-autorise')) {
      uxIssues.push(`Redirection ${p.route} → ${p.finalUrl.replace(BASE_URL, '')}`);
    }
    if (p.httpStatus === 404) uxIssues.push(`Route inexistante : ${p.route}`);
  }

  const priorities = [];
  if (!state.login.success) priorities.push({ p: 'P0', item: 'Connexion authentifiée impossible' });
  if (state.chunkErrors.length) priorities.push({ p: 'P0', item: `${state.chunkErrors.length} erreur(s) chunks /_next/static` });
  if (state.apiErrors.filter((e) => e.status >= 500).length) {
    priorities.push({ p: 'P0', item: 'Erreurs API 5xx en navigation authentifiée' });
  }
  if (pagesBroken.length) priorities.push({ p: 'P1', item: `${pagesBroken.length} page(s) en échec fonctionnel` });
  if (state.sidebar?.issues?.length) priorities.push({ p: 'P1', item: 'Sidebar expand/collapse à corriger' });
  if (state.themes?.issues?.length) priorities.push({ p: 'P2', item: 'Contrastes mode clair/sombre' });
  if (state.responsive?.issues?.length) priorities.push({ p: 'P2', item: 'Responsive mobile (overflow)' });
  if (consoleErrors.length) priorities.push({ p: 'P2', item: `${consoleErrors.length} erreur(s) console` });

  const actionPlan = [
    'Corriger P0 : login, chunks 404, API 5xx',
    'Ajouter redirects pour routes legacy du prompt (/cockpit → /dashboard, etc.)',
    'Vérifier garde d’accès /non-autorise sur modules admin',
    'Rejouer `npm run audit:vercel` après correctifs',
    'Étendre l’audit aux rôles démo / commercial / production',
  ];

  const lines = [];
  lines.push('# Audit Vercel authentifié — ANS ORION');
  lines.push('');
  lines.push(`> Généré le **${new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' })}**`);
  lines.push(`> Base : \`${BASE_URL}\``);
  lines.push(`> Compte : \`${LOGIN_EMAIL}\` (via .env.audit.local)`);
  lines.push('');
  lines.push('## 1. Résumé général');
  lines.push('');
  lines.push(`| Indicateur | Valeur |`);
  lines.push(`|------------|--------|`);
  lines.push(`| Connexion | ${state.login.success ? '✅ OK' : '❌ Échec'} |`);
  lines.push(`| Pages auditées | ${state.pages.length} |`);
  lines.push(`| Pages OK | ${pagesOk.length} |`);
  lines.push(`| Pages en échec | ${pagesBroken.length} |`);
  lines.push(`| Erreurs réseau (4xx/5xx/failed) | ${networkErrors.length} |`);
  lines.push(`| Erreurs console | ${consoleErrors.length} |`);
  lines.push(`| Erreurs chunks \`/_next/static\` | ${state.chunkErrors.length} |`);
  lines.push(`| Erreurs API | ${state.apiErrors.length} |`);
  lines.push(`| Screenshots | \`audit-screenshots/\` (${state.screenshotIndex} fichiers) |`);
  lines.push('');

  lines.push('## 2. Connexion');
  lines.push('');
  lines.push(`- Début : ${state.login.startedAt}`);
  lines.push(`- Fin : ${state.login.endedAt}`);
  lines.push(`- Succès : **${state.login.success ? 'oui' : 'non'}**`);
  if (state.login.user) lines.push(`- Utilisateur session : ${state.login.user}`);
  lines.push(`- URL finale : ${state.login.finalUrl || '—'}`);
  if (state.login.error) lines.push(`- Erreur : \`${state.login.error}\``);
  lines.push('');

  lines.push('## 3. Pages auditées');
  lines.push('');
  lines.push('| Route | HTTP | URL finale | Statut | Screenshot |');
  lines.push('|-------|------|------------|--------|------------|');
  for (const p of state.pages) {
    const status = p.ok ? 'OK' : p.issues.join('; ') || 'KO';
    const shot = p.screenshot ? `[voir](${p.screenshot})` : '—';
    lines.push(`| \`${p.label}\` | ${p.httpStatus ?? '—'} | \`${p.finalUrl.replace(BASE_URL, '') || '/'}\` | ${status} | ${shot} |`);
  }
  lines.push('');

  lines.push('## 4. Pages OK');
  lines.push('');
  if (!pagesOk.length) lines.push('_Aucune_');
  else pagesOk.forEach((p) => lines.push(`- \`${p.label}\``));
  lines.push('');

  lines.push('## 5. Pages cassées');
  lines.push('');
  if (!pagesBroken.length) lines.push('_Aucune_');
  else {
    for (const p of pagesBroken) {
      lines.push(`### \`${p.label}\``);
      lines.push(`- Issues : ${p.issues.join(' · ') || 'inconnu'}`);
      if (p.screenshot) lines.push(`- Capture : [${p.screenshot}](${p.screenshot})`);
      lines.push('');
    }
  }

  lines.push('## 6. Erreurs réseau');
  lines.push('');
  if (!networkErrors.length) lines.push('_Aucune significative_');
  else {
    lines.push('| URL | Status | Page |');
    lines.push('|-----|--------|------|');
    for (const e of networkErrors.slice(0, 80)) {
      lines.push(`| \`${e.url.replace(BASE_URL, '')}\` | ${e.status ?? e.failure ?? '—'} | \`${(e.pageUrl || '').replace(BASE_URL, '')}\` |`);
    }
    if (networkErrors.length > 80) lines.push(`\n_… et ${networkErrors.length - 80} autres_`);
  }
  lines.push('');

  lines.push('## 7. Erreurs console');
  lines.push('');
  if (!consoleErrors.length) lines.push('_Aucune_');
  else {
    for (const e of state.consoleErrors.slice(0, 40)) {
      lines.push(`- \`${(e.text || '').slice(0, 200)}\` _(sur ${e.url?.replace(BASE_URL, '')})_`);
    }
    if (state.consoleErrors.length > 40) lines.push(`\n_… et ${state.consoleErrors.length - 40} autres_`);
  }
  lines.push('');

  lines.push('## 8. Problèmes CSS / chunks');
  lines.push('');
  if (!state.chunkErrors.length) lines.push('_Aucune erreur chunk détectée_');
  else {
    for (const e of state.chunkErrors) {
      lines.push(`- **${e.status}** \`${e.url}\``);
    }
  }
  lines.push('');

  lines.push('## 9. Problèmes sidebar');
  lines.push('');
  if (!state.sidebar?.issues?.length) lines.push('_Sidebar OK (étendue + réduite)_');
  else state.sidebar.issues.forEach((i) => lines.push(`- ${i}`));
  if (state.sidebar?.expanded) lines.push(`- [Sidebar étendue](${state.sidebar.expanded})`);
  if (state.sidebar?.collapsed) lines.push(`- [Sidebar réduite](${state.sidebar.collapsed})`);
  lines.push('');

  lines.push('## 10. Problèmes contrastes');
  lines.push('');
  if (!state.themes?.issues?.length) lines.push('_Aucun problème de contraste évident détecté_');
  else state.themes.issues.forEach((i) => lines.push(`- ${i}`));
  if (state.themes?.light) lines.push(`- [Mode clair](${state.themes.light})`);
  if (state.themes?.dark) lines.push(`- [Mode sombre](${state.themes.dark})`);
  lines.push('');

  lines.push('## 11. Problèmes UX');
  lines.push('');
  if (!uxIssues.length) lines.push('_RAS_');
  else uxIssues.forEach((i) => lines.push(`- ${i}`));
  lines.push('');

  lines.push('## 12. Problèmes responsive');
  lines.push('');
  if (!state.responsive?.issues?.length) lines.push('_Pas de overflow horizontal détecté sur l’échantillon mobile_');
  else state.responsive.issues.forEach((i) => lines.push(`- ${i}`));
  lines.push('');

  lines.push('## 13. Priorités de correction');
  lines.push('');
  if (!priorities.length) lines.push('_Aucune priorité critique_');
  else priorities.forEach(({ p, item }) => lines.push(`- **${p}** — ${item}`));
  lines.push('');

  lines.push('## 14. Plan d’action Cursor (étape par étape)');
  lines.push('');
  actionPlan.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run audit:vercel');
  lines.push('```');

  return lines.join('\n');
}

async function main() {
  assertEnv();
  ensureDirs();

  const state = {
    login: {},
    pages: [],
    consoleErrors: [],
    failedResponses: [],
    chunkErrors: [],
    apiErrors: [],
    requestFailures: [],
    sidebar: null,
    themes: null,
    responsive: null,
    screenshotIndex: 1,
  };

  console.log(`[audit] Base URL : ${BASE_URL}`);
  const browser = await launchBrowser();
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: VIEWPORTS.desktop,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  attachCollectors(page, state);

  const loggedIn = await login(page, state);
  if (!loggedIn) {
    console.error('[audit] Connexion échouée — rapport partiel généré.');
  } else {
    console.log('[audit] Connexion OK — parcours des routes…');

    const allRoutes = [...new Set([...REQUESTED_ROUTES, ...CANONICAL_ROUTES])];
    for (const route of allRoutes) {
      process.stdout.write(`  → ${route}\n`);
      await auditRoute(page, route, state, { label: route, viewport: 'desktop' });
    }

    await auditSidebar(page, state);
    await auditThemes(page, state);
    await auditResponsive(page, state);
  }

  const report = buildReport(state);
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  await browser.close();

  console.log(`\n[audit] Rapport : ${REPORT_PATH}`);
  console.log(`[audit] Screenshots : ${SCREENSHOT_DIR}`);
  console.log(`[audit] Pages OK : ${state.pages.filter((p) => p.ok).length} / ${state.pages.length}`);

  if (!loggedIn) process.exit(1);
}

main().catch((err) => {
  console.error('[audit] Fatal:', err);
  process.exit(1);
});
