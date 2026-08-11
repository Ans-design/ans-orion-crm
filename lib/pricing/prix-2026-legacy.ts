/**
 * PRIX 2026 — archive legacy uniquement.
 * Par défaut désactivé pour le calcul POS/devis (source métier erronée).
 * Activer explicitement via USE_PRIX_2026_LEGACY=true pour migration/audit lecture seule.
 * Jamais actif en STRICT / production (PRX-01 suite 7).
 * Note : ne pas importer pos-price-policy ici (dépendance circulaire).
 */

function isProductionLikeDeploy(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.HOSTINGER === 'true') return true;
  if (process.env.USE_PRODUCTION_DB === 'true') return true;
  const env = (process.env.APP_ENV || '').toLowerCase();
  return env === 'production' || env === 'prod' || env === 'staging';
}

/** Miroir léger de isStrictPosPricing — sans import circulaire. */
function isStrictLikePricing(): boolean {
  if (process.env.STRICT_POS_PRICING === '0' || process.env.STRICT_POS_PRICING === 'false') {
    return isProductionLikeDeploy();
  }
  if (process.env.STRICT_POS_PRICING === '1' || process.env.STRICT_POS_PRICING === 'true') return true;
  if (isProductionLikeDeploy()) return true;
  const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  return env === 'ci' || env === 'production' || env === 'prod' || env === 'staging';
}

export function isPrix2026LegacyEnabled(): boolean {
  if (process.env.USE_PRIX_2026_LEGACY !== 'true') return false;
  // Opt-in local/dev uniquement — jamais staging / prod / STRICT
  if (isProductionLikeDeploy()) return false;
  if (isStrictLikePricing()) return false;
  return true;
}

export const PRIX_2026_LEGACY_STATUS = 'Legacy — non utilisé pour calcul';
