import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ensureAuthRuntimeEnv } from '@/lib/auth-runtime-url';
import { getNextAuthSecret } from '@/lib/auth-secret';
import { checkRateLimit, checkRateLimitAsync } from '@/lib/rate-limit';
import { getHomeRouteForRole } from '@/lib/modules/role-registry';
import { getUnauthorizedPageRedirect } from '@/lib/page-access';
import { SECURITY_HEADERS } from '@/lib/security-headers';
import { isPublicPage } from '@/lib/auth/public-routes';
import { isPublicApiPath } from '@/lib/auth/public-api-routes';

/** Comparaison constante (Edge-safe) pour secrets cron. */
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!res.headers.has(key)) res.headers.set(key, value);
  }
  return res;
}

/** setup-db n’est plus public — géré ci-dessous (local + ALLOW_SETUP_DB uniquement). */

/** Redirections legacy (doublon next.config — fiabilité Vercel / edge). */
const LEGACY_PAGE_REDIRECTS: Record<string, string> = {
  '/cockpit': '/dashboard',
  '/crm/clients': '/clients',
  '/catalogue-pos': '/pos',
  '/panier-devis': '/panier',
  '/communication/ans-talk': '/messagerie',
  '/finance/paiements': '/paiements',
  '/finance/factures': '/factures',
  '/logistique': '/livraisons',
  '/ans-talk': '/messagerie',
  '/chat': '/messagerie',
  '/equipe/messages': '/messagerie',
  '/gpao': '/production',
  '/kanban': '/production',
};

function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith('/_next') || /\.[a-zA-Z0-9]+$/.test(pathname);
}

async function readAuthToken(req: NextRequest) {
  ensureAuthRuntimeEnv();
  const secret = getNextAuthSecret();
  const secureName = '__Secure-next-auth.session-token';
  const plainName = 'next-auth.session-token';
  const hasSecure = Boolean(req.cookies.get(secureName)?.value);
  const hasPlain = Boolean(req.cookies.get(plainName)?.value);

  // Un seul décodage JWT si le cookie présent est connu (évite double getToken).
  if (hasSecure && !hasPlain) {
    return getToken({ req, secret, secureCookie: true, cookieName: secureName });
  }
  if (hasPlain && !hasSecure) {
    return getToken({ req, secret, secureCookie: false, cookieName: plainName });
  }

  let token = await getToken({
    req,
    secret,
    secureCookie: true,
    cookieName: secureName,
  });
  if (!token) {
    token = await getToken({
      req,
      secret,
      secureCookie: false,
      cookieName: plainName,
    });
  }
  return token;
}

function rateLimit429(message: string, retryAfterSec?: number) {
  return withSecurityHeaders(
    NextResponse.json(
      { error: message },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec ?? 60) } },
    ),
  );
}

async function handleApiAuth(req: NextRequest, pathname: string) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // Rate-limit AVANT allowlist publique (sinon auth/BAT/signup ne sont jamais limités)
  if (pathname.startsWith('/api/auth/callback') && req.method === 'POST') {
    const rl = await checkRateLimitAsync(`auth:${ip}`, 20, 60_000);
    if (!rl.ok) return rateLimit429('Trop de tentatives. Réessayez dans quelques minutes.', rl.retryAfterSec);
  }

  const authSensitivePost =
    pathname === '/api/auth/login-fail' ||
    pathname === '/api/auth/login-check' ||
    pathname === '/api/auth/forgot-password' ||
    pathname === '/api/auth/reset-password' ||
    pathname === '/api/auth/access-request';

  if (authSensitivePost && req.method === 'POST') {
    const rl = await checkRateLimitAsync(`auth-sensitive:${ip}:${pathname}`, 30, 60_000);
    if (!rl.ok) return rateLimit429('Trop de requêtes auth. Réessayez plus tard.', rl.retryAfterSec);
  }

  if (pathname === '/api/signup' && req.method === 'POST') {
    const rl = await checkRateLimitAsync(`signup:${ip}`, 5, 60_000);
    if (!rl.ok) return rateLimit429('Trop de créations de compte. Réessayez plus tard.', rl.retryAfterSec);
    // Signup public géré dans la route (fail-closed prod) — ne pas exiger session ici
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname === '/api/auth/public-info' && req.method === 'GET') {
    const rl = await checkRateLimitAsync(`public-info:${ip}`, 60, 60_000);
    if (!rl.ok) return rateLimit429('Rate limit', rl.retryAfterSec);
  }

  if (pathname.startsWith('/api/bat/client')) {
    const rl = await checkRateLimitAsync(`bat-client:${ip}`, 10, 60_000);
    if (!rl.ok) return rateLimit429('Trop de requêtes BAT. Réessayez plus tard.', rl.retryAfterSec);
  }

  // AUTH-004 : allowlist exacte (plus de préfixe /api/auth entier)
  if (isPublicApiPath(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // setup-db : jamais public en prod ; hors prod uniquement si ALLOW_SETUP_DB + local
  if (pathname === '/api/setup-db') {
    const prod =
      process.env.NODE_ENV === 'production' ||
      process.env.USE_PRODUCTION_DB === 'true' ||
      process.env.HOSTINGER === 'true' ||
      process.env.VERCEL_ENV === 'production' ||
      process.env.VERCEL_ENV === 'preview' ||
      Boolean(process.env.HOSTINGER_SITE_URL?.trim());
    const localOk =
      process.env.ALLOW_SETUP_DB === 'true' &&
      (process.env.APP_ENV === 'local' ||
        process.env.LOCAL_DEV === 'true' ||
        process.env.NODE_ENV === 'development');
    if (prod || !localOk) {
      return withSecurityHeaders(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/api/cron/')) {
    const rl = await checkRateLimitAsync(`cron:${ip}`, 10, 60_000);
    if (!rl.ok) return rateLimit429('Rate limit cron', rl.retryAfterSec);
    // SEC-09 : secret obligatoire dès le middleware (timing-safe)
    const cronSecret = process.env.CRON_SECRET?.trim() ?? '';
    if (cronSecret.length < 16) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 }),
      );
    }
    const provided =
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim() ||
      req.headers.get('x-cron-secret')?.trim() ||
      '';
    const a = provided;
    const b = cronSecret;
    const ok = a.length > 0 && timingSafeEqualString(a, b);
    if (!ok) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Non autorisé' }, { status: 401 }),
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  const token = await readAuthToken(req);
  if (!token) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Session requise' }, { status: 401 }),
    );
  }

  // Opérations critiques authentifiées
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const uid = String(token.sub || token.id || 'user');
    const isUpload =
      pathname === '/api/files' ||
      pathname === '/api/messaging/upload' ||
      pathname.endsWith('/upload') ||
      pathname.includes('/fichiers');
    const isPayment =
      pathname === '/api/paiements' ||
      pathname === '/api/paiements/batch' ||
      (pathname.startsWith('/api/paiements/') && pathname.endsWith('/refund'));
    const isPublish =
      pathname.includes('/publish') ||
      pathname === '/api/admin-backoffice/pricing/publish-bulk';

    if (isUpload) {
      const rl = await checkRateLimitAsync(`upload:${uid}:${ip}`, 30, 60_000);
      if (!rl.ok) return rateLimit429('Trop d’uploads. Réessayez plus tard.', rl.retryAfterSec);
    }
    if (isPayment) {
      const rl = await checkRateLimitAsync(`payment:${uid}`, 40, 60_000);
      if (!rl.ok) return rateLimit429('Trop de créations de paiement.', rl.retryAfterSec);
    }
    if (isPublish) {
      const rl = await checkRateLimitAsync(`pricing-publish:${uid}`, 10, 60_000);
      if (!rl.ok) return rateLimit429('Trop de publications tarifaires.', rl.retryAfterSec);
    }
  }

  // SEC-01 : forcer changement MDP avant APIs métier (sauf endpoint dédié)
  if (
    token.mustChangePassword === true &&
    pathname !== '/api/auth/change-password' &&
    pathname !== '/api/auth/session'
  ) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Changement de mot de passe obligatoire', code: 'MUST_CHANGE_PASSWORD' },
        { status: 403 },
      ),
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const legacyDest = LEGACY_PAGE_REDIRECTS[pathname];
  if (legacyDest) {
    const url = req.nextUrl.clone();
    url.pathname = legacyDest;
    // Conserver deep links Talk (?conv=, ?tab=annonces, ?commande=)
    if (
      legacyDest === '/messagerie' &&
      (pathname === '/ans-talk' ||
        pathname === '/chat' ||
        pathname === '/communication/ans-talk' ||
        pathname === '/equipe/messages')
    ) {
      /* keep url.search */
    } else {
      url.search = '';
    }
    return withSecurityHeaders(NextResponse.redirect(url, 308));
  }

  if (pathname === '/api/health' || pathname.startsWith('/api/health/')) {
    return withSecurityHeaders(NextResponse.next());
  }

  ensureAuthRuntimeEnv();

  if (pathname.startsWith('/api/')) {
    return handleApiAuth(req, pathname);
  }

  if (isPublicPage(pathname) || isStaticAsset(pathname)) {
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      const token = await readAuthToken(req);
      if (token) {
        const role = (token.role as string) || 'user';
        const url = req.nextUrl.clone();
        url.pathname = getHomeRouteForRole(role);
        url.search = '';
        return withSecurityHeaders(NextResponse.redirect(url));
      }
    }
    return withSecurityHeaders(NextResponse.next());
  }

  const token = await readAuthToken(req);
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('reason', 'session_expired');
    if (pathname !== '/') {
      url.searchParams.set('callbackUrl', pathname);
    }
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  // SEC-01 — bootstrap / reset admin : changement MDP obligatoire
  if (
    token.mustChangePassword === true &&
    pathname !== '/change-password' &&
    !pathname.startsWith('/change-password/') &&
    pathname !== '/login' &&
    pathname !== '/api/auth/signout'
  ) {
    const url = req.nextUrl.clone();
    url.pathname = '/change-password';
    url.search = '';
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  const role = (token.role as string) || 'user';
  const denied = getUnauthorizedPageRedirect(pathname, role);
  if (denied) {
    return withSecurityHeaders(NextResponse.redirect(new URL(denied, req.nextUrl.origin)));
  }

  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return withSecurityHeaders(response);
}

/**
 * Matcher Next.js — doit rester un littéral (pas de spread) pour que Next le parse.
 * Doit inclure /api (SEC-001). Ne pas réintroduire `(?!api|…)`.
 * Garder synchronisé avec `MIDDLEWARE_MATCHER` dans `lib/middleware-matcher.ts`.
 */
export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};
