/**
 * Fail-closed production — appelé au boot Node (instrumentation).
 * Si DEMO / quick-login / signup public / récupération non sécurisée est forcé en prod → throw.
 */
import {
  isDemoLoginFeaturesEnabled,
  isProductionDeploy,
  isPublicSignupEnabled,
  isQuickLoginEnabled,
} from '@/lib/auth-environment';

export function assertProductionSecurityBoot(): void {
  if (!isProductionDeploy()) return;

  const violations: string[] = [];

  if (process.env.DEMO_MODE === 'true') {
    violations.push('DEMO_MODE=true interdit en production');
  }
  if (process.env.ALLOW_DEMO_LOGIN === 'true') {
    violations.push('ALLOW_DEMO_LOGIN=true interdit en production');
  }
  if (process.env.ALLOW_QUICK_LOGIN === 'true') {
    violations.push('ALLOW_QUICK_LOGIN=true interdit en production');
  }
  if (process.env.ALLOW_PUBLIC_SIGNUP === 'true') {
    violations.push('ALLOW_PUBLIC_SIGNUP=true interdit en production');
  }
  if (process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true') {
    violations.push('NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=true interdit en production');
  }
  if (process.env.USE_PRIX_2026_LEGACY === 'true') {
    violations.push('USE_PRIX_2026_LEGACY=true interdit en production (PRX-01)');
  }

  // Double contrôle : les helpers ne doivent jamais réactiver ces modes en prod
  if (isDemoLoginFeaturesEnabled()) violations.push('isDemoLoginFeaturesEnabled() true en prod');
  if (isQuickLoginEnabled()) violations.push('isQuickLoginEnabled() true en prod');
  if (isPublicSignupEnabled()) violations.push('isPublicSignupEnabled() true en prod');

  const cron = process.env.CRON_SECRET?.trim() || '';
  if (cron.length < 16) {
    violations.push('CRON_SECRET manquant ou < 16 caractères');
  }

  if (violations.length > 0) {
    const msg = `[SEC-01] Démarrage production refusé:\n- ${violations.join('\n- ')}`;
    console.error(msg);
    throw new Error(msg);
  }
}
