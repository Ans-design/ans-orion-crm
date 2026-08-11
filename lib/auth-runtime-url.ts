import { DEMO_VERCEL_SECRET } from '@/lib/auth-secret';

/**
 * Aligne NEXTAUTH_URL / DEMO_MODE / secret sur l'hôte réel (Vercel ou local).
 */
export function ensureAuthRuntimeEnv(): void {
  if (process.env.VERCEL === '1') {
    process.env.AUTH_TRUST_HOST = 'true';

    const vercelHost = process.env.VERCEL_URL?.trim();
    const runtimeUrl = vercelHost ? `https://${vercelHost}` : '';
    const vercelEnv = process.env.VERCEL_ENV;

    if (vercelEnv === 'preview' && runtimeUrl) {
      process.env.NEXTAUTH_URL = runtimeUrl;
    } else if (!process.env.NEXTAUTH_URL?.startsWith('https://') && runtimeUrl) {
      process.env.NEXTAUTH_URL = runtimeUrl;
    }

    // Ne plus forcer DEMO_MODE sur Vercel (sécurité) — opt-in via DEMO_MODE / ALLOW_DEMO_LOGIN.
    // USE_PRODUCTION_DB=true reste le mode prod DB ; sans secret fort getNextAuthSecret échoue.
  } else if (
    process.env.NODE_ENV === 'production' &&
    !process.env.NEXTAUTH_URL?.startsWith('http')
  ) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
    if (appUrl) {
      process.env.AUTH_TRUST_HOST = 'true';
      process.env.NEXTAUTH_URL = appUrl;
    }
  } else if (
    process.env.LOCAL_DEV === 'true' ||
    process.env.APP_ENV === 'local' ||
    process.env.NODE_ENV === 'development'
  ) {
    process.env.AUTH_TRUST_HOST = 'true';
    const port = process.env.PORT?.trim() || '3020';
    const hostRaw = process.env.HOST?.trim() || '127.0.0.1';
    const host = hostRaw === '0.0.0.0' ? '127.0.0.1' : hostRaw;
    const localUrl = `http://${host}:${port}`;
    if (!process.env.NEXTAUTH_URL?.startsWith('http')) {
      process.env.NEXTAUTH_URL = localUrl;
    }
  }

  const allowDemoSecret =
    process.env.APP_ENV === 'local' ||
    process.env.LOCAL_DEV === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.DEMO_MODE === 'true' ||
    process.env.E2E_MODE === 'true';

  const forcedProd =
    process.env.USE_PRODUCTION_DB === 'true' ||
    process.env.HOSTINGER === 'true' ||
    Boolean(process.env.HOSTINGER_SITE_URL?.trim()) ||
    (process.env.NODE_ENV === 'production' && !allowDemoSecret);

  const current = process.env.NEXTAUTH_SECRET?.trim();
  if (!current || current.length < 32 || current === DEMO_VERCEL_SECRET) {
    /** Jamais injecter le secret démo partagé — dérivé local uniquement. */
    if (!forcedProd && allowDemoSecret) {
      const localSeed = `ans-orion-local-only-${process.env.COMPUTERNAME || 'dev'}-do-not-deploy`;
      process.env.NEXTAUTH_SECRET =
        localSeed.length >= 32 ? localSeed.padEnd(48, '0').slice(0, 48) : 'ans-orion-local-dev-secret-do-not-deploy-xxxx';
    }
  }

  const authSecret = process.env.AUTH_SECRET?.trim();
  const secretPlaceholder =
    !authSecret ||
    authSecret.length < 32 ||
    authSecret.includes('identique') ||
    authSecret.includes('remplacer');
  if (secretPlaceholder && process.env.NEXTAUTH_SECRET) {
    process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
  }
}
