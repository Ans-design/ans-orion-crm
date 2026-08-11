/**
 * Matcher Next.js middleware — doit inclure /api (SEC-001).
 * Ne pas réintroduire `(?!api|…)` dans l’exclusion.
 * La valeur exportée doit rester alignée avec `export const config` dans `middleware.ts`
 * (Next.js refuse le spread / import dynamique pour `config.matcher`).
 */
export const MIDDLEWARE_MATCHER = [
  '/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
] as const;

export const MIDDLEWARE_INCLUDES_API = !MIDDLEWARE_MATCHER.some((m) =>
  m.includes('?!api|') || m.includes('?!api|_next'),
);
