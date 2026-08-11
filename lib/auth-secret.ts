/**
 * Résolution NEXTAUTH_SECRET — aucun fallback littéral partagé (SEC-002 V10).
 * Local/test : valeur dérivée non secrète uniquement si APP_ENV=local / NODE_ENV=test|development.
 */

const KNOWN_INSECURE = new Set([
  'orion-vercel-demo-secret-32chars-min',
  'changeme',
  'secret',
  'nextauth_secret',
  'development-secret-change-me-32chars',
]);

function hasStrongSecret(value: string | undefined): value is string {
  return Boolean(value && value.trim().length >= 32 && !KNOWN_INSECURE.has(value.trim()));
}

function isExplicitLocalOrTest(): boolean {
  return (
    process.env.APP_ENV === 'local' ||
    process.env.LOCAL_DEV === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.E2E_MODE === 'true' ||
    Boolean(process.env.DATABASE_URL?.includes('file:'))
  );
}

function isHardenedRuntime(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') return true;
  if (process.env.USE_PRODUCTION_DB === 'true') return true;
  if (process.env.HOSTINGER === 'true' || Boolean(process.env.HOSTINGER_SITE_URL?.trim())) return true;
  return false;
}

/** Secret NextAuth — refuse placeholders en prod/preview/Hostinger/USE_PRODUCTION_DB. */
export function getNextAuthSecret(): string {
  const current =
    process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();

  if (hasStrongSecret(current)) return current;

  // SEC-002 : runtime durci ⇒ secret obligatoire (pas d’échappatoire via NODE_ENV=test / file: DB).
  if (isHardenedRuntime()) {
    throw new Error(
      '[auth] NEXTAUTH_SECRET (ou AUTH_SECRET) requis — min. 32 caractères, non placeholder (SEC-002)',
    );
  }

  if (!isExplicitLocalOrTest() && process.env.DEMO_MODE !== 'true') {
    throw new Error('[auth] NEXTAUTH_SECRET (ou AUTH_SECRET) requis — min. 32 caractères');
  }

  // Local / test uniquement : dérivé déterministe — jamais le placeholder démo partagé.
  const localSeed = `ans-orion-local-only-${process.env.COMPUTERNAME || 'dev'}-do-not-deploy`;
  if (localSeed.length >= 32) return localSeed.padEnd(48, '0').slice(0, 48);
  return 'ans-orion-local-dev-secret-do-not-deploy-xxxx';
}

/** @deprecated Ne plus utiliser — conservé pour tests de détection de placeholders. */
export const DEMO_VERCEL_SECRET = 'orion-vercel-demo-secret-32chars-min';

export function assertAuthSecretSafeForRuntime(): void {
  getNextAuthSecret();
}
