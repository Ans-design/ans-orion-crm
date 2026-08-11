'use client';

/**
 * Bannière visible uniquement si le fallback démo prix est explicitement activé
 * (NEXT_PUBLIC_ALLOW_DEMO_PRICING_FALLBACK). Ne s’affiche jamais en prod build.
 */
export function DemoPricingFallbackBanner() {
  if (process.env.NEXT_PUBLIC_ALLOW_DEMO_PRICING_FALLBACK !== 'true') return null;
  if (process.env.NEXT_PUBLIC_APP_ENV === 'production' || process.env.NEXT_PUBLIC_APP_ENV === 'staging') {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-center text-xs font-medium text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
    >
      Mode démo tarifaire — fallbacks catalogue locaux actifs. Ne pas utiliser en staging/production.
    </div>
  );
}
