/**
 * Détection d’environnement auth — fail-safe (AUTH-001 V10).
 * `NODE_ENV=production` active le durcissement par défaut.
 * Exceptions local/test uniquement via flags explicites.
 */

function explicitLocalBypass(): boolean {
  // Uniquement si explicitement marqué local ET pas Hostinger/Vercel prod
  if (process.env.VERCEL_ENV === 'production') return false;
  if (process.env.HOSTINGER === 'true') return false;
  if (process.env.USE_PRODUCTION_DB === 'true') return false;
  return (
    process.env.APP_ENV === 'local' ||
    process.env.LOCAL_DEV === 'true' ||
    process.env.ALLOW_INSECURE_LOCAL === 'true'
  );
}

/** Déploiement production / preview public — politique sécurité renforcée. */
export function isProductionDeploy(): boolean {
  // AUTH-001 : NODE_ENV=production ⇒ durcissement sauf bypass local explicite.
  if (process.env.NODE_ENV === 'production') {
    if (explicitLocalBypass()) return false;
    return true;
  }

  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.HOSTINGER === 'true' || Boolean(process.env.HOSTINGER_SITE_URL?.trim())) {
    return true;
  }
  if (process.env.USE_PRODUCTION_DB === 'true') return true;

  return false;
}

/** Preview Vercel publique — secrets uniques requis, pas de quick-login. */
export function isPublicPreviewDeploy(): boolean {
  return process.env.VERCEL_ENV === 'preview' && !explicitLocalBypass();
}

/** Fonctionnalités login démo (cartes rapides, inscription publique, hints). */
export function isDemoLoginFeaturesEnabled(): boolean {
  if (isProductionDeploy()) return false;
  if (isPublicPreviewDeploy()) return false;
  if (process.env.DEMO_MODE === 'true') return true;
  if (process.env.ALLOW_DEMO_LOGIN === 'true') return true;
  if (process.env.E2E_MODE === 'true') return true;
  if (process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true') return true;
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

/** Accès direct (cartes admin / démo) — désactivé en production sauf ALLOW_QUICK_LOGIN=true hors prod. */
export function isQuickLoginEnabled(): boolean {
  if (isProductionDeploy()) return false;
  if (isPublicPreviewDeploy()) return false;
  if (process.env.DISABLE_QUICK_LOGIN === 'true') return false;
  if (process.env.ALLOW_QUICK_LOGIN === 'false') return false;
  if (process.env.ALLOW_QUICK_LOGIN === 'true') return true;
  if (isDemoLoginFeaturesEnabled()) return true;
  if (process.env.NODE_ENV === 'production') return false;
  return true;
}

/** Inscription publique — fermée en prod sauf ALLOW_PUBLIC_SIGNUP=true ou bootstrap. */
export function isPublicSignupEnabled(): boolean {
  if (isProductionDeploy()) return false;
  if (isPublicPreviewDeploy()) return false;
  if (process.env.ALLOW_PUBLIC_SIGNUP === 'false') return false;
  if (process.env.ALLOW_PUBLIC_SIGNUP === 'true') return true;
  if (isDemoLoginFeaturesEnabled()) return true;
  if (process.env.NODE_ENV === 'production') return false;
  return true;
}

/** Comptes matricule Orion v29 — désactivés en prod ; exigent ORION_V29_PASSWORDS_JSON. */
export function isV29MatriculeAuthEnabled(): boolean {
  if (isProductionDeploy()) return false;
  if (isPublicPreviewDeploy()) return false;
  if (process.env.ALLOW_V29_AUTH === 'false') return false;
  if (process.env.ALLOW_V29_AUTH === 'true') return true;
  if (isDemoLoginFeaturesEnabled()) return true;
  return false;
}

/** Affichage des hints v29 côté client (page login) — jamais les mots de passe. */
export function isV29PasswordHintEnabled(): boolean {
  return false;
}

/** Flags login pour API publique / setup-status. */
export function getLoginSecurityFlags(needsSetup = false) {
  return {
    needsSetup,
    demoMode: isDemoLoginFeaturesEnabled(),
    allowSignup: needsSetup || isPublicSignupEnabled(),
    showQuickLogin: isQuickLoginEnabled(),
    showV29Profiles: isV29MatriculeAuthEnabled(),
    productionHardened: isProductionDeploy(),
  };
}
