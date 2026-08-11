/**
 * Politique source de prix — STRICT / démo locale.
 * Staging + production = STRICT (pas de fallback catalogue / Excel / prixDepart).
 * Local explicite (APP_ENV=local) : STRICT uniquement via flag — même si NODE_ENV=production (`next start` E2E).
 */

export function isProductionLikeDeploy(): boolean {
  if (process.env.HOSTINGER === 'true') return true;
  if (process.env.USE_PRODUCTION_DB === 'true') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  const env = (process.env.APP_ENV || '').toLowerCase();
  if (env === 'production' || env === 'prod') return true;
  // NODE_ENV=production seul ne suffit pas si APP_ENV=local (next start E2E)
  if (isLocalDevSession()) return false;
  if (process.env.NODE_ENV === 'production') return true;
  return false;
}

export function isLocalDevSession(): boolean {
  const env = (process.env.APP_ENV || '').toLowerCase();
  return env === 'local' || env === 'development' || env === 'dev' || process.env.LOCAL_DEV === 'true';
}

export function isStagingLikeDeploy(): boolean {
  const env = (process.env.APP_ENV || process.env.VERCEL_ENV || '').toLowerCase();
  return env === 'staging' || env === 'preview' || process.env.VERCEL_ENV === 'preview';
}

/**
 * Démo locale explicite — autorise fallbacks catalogue (prixDepart) UNIQUEMENT
 * si ALLOW_DEMO_PRICING_FALLBACK=true et hors prod/staging.
 */
export function isDemoPricingFallbackAllowed(): boolean {
  if (isStagingLikeDeploy()) return false;
  if (process.env.USE_PRODUCTION_DB === 'true' || process.env.HOSTINGER === 'true') return false;
  const app = (process.env.APP_ENV || '').toLowerCase();
  if (app === 'production' || app === 'prod') return false;
  if (process.env.ALLOW_DEMO_PRICING_FALLBACK !== 'true' && process.env.ALLOW_DEMO_PRICING_FALLBACK !== '1') {
    return false;
  }
  return isLocalDevSession();
}

export function isDemoPricingFallbackActive(): boolean {
  return isDemoPricingFallbackAllowed();
}

/** STRICT opérationnel : staging/prod/CI, ou flag STRICT ; local = flag only. */
export function isOperationalStrictPricing(): boolean {
  if (isStagingLikeDeploy()) return true;
  if (process.env.USE_PRODUCTION_DB === 'true' || process.env.HOSTINGER === 'true') return true;
  const app = (process.env.APP_ENV || '').toLowerCase();
  if (app === 'production' || app === 'prod' || app === 'ci') return true;
  if (process.env.VERCEL_ENV === 'production') return true;

  if (isLocalDevSession()) {
    if (process.env.STRICT_POS_PRICING === '0' || process.env.STRICT_POS_PRICING === 'false') return false;
    return process.env.STRICT_POS_PRICING === '1' || process.env.STRICT_POS_PRICING === 'true';
  }

  if (process.env.STRICT_POS_PRICING === '0' || process.env.STRICT_POS_PRICING === 'false') {
    return process.env.NODE_ENV === 'production';
  }
  if (process.env.STRICT_POS_PRICING === '1' || process.env.STRICT_POS_PRICING === 'true') return true;
  return process.env.NODE_ENV === 'production';
}
