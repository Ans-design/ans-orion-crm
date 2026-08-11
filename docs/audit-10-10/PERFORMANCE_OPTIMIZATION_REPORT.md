# Performance — Rapport optimisation

## État actuel

| Métrique | État | Réf |
|---|---|---|
| Vitest 1154 tests | ~11s | ✅ |
| Build Next | ~45s | ✅ |
| Bundle First Load JS | ~88 kB shared | Acceptable |
| Tables virtualisées | Stock (`OrionColumnTable`) | Partiel |

## Règles projet (`docs/PERFORMANCE.md`)

- Pagination > 50 lignes
- Virtualisation > 60 lignes
- Lazy-load backoffice panels, graphiques
- Debounce recherche 280ms ✅ matières
- Pas d'appels Hostinger en `APP_ENV=local`

## Points à optimiser

### P1 — Tables backoffice

| Table | Lignes typiques | Action |
|---|---|---|
| Options/chips global | 95 × 20+ vars | Virtualisation TanStack |
| Matières & prix | 150+ | OK scroll ; indexer recherche API |
| Stock | 200+ | ✅ virtualizeThreshold=50 |

### P1 — Prisma N+1

- `listUnifiedMaterialPrices` : enrichMaterialWithStock par ligne
- **Fix :** batch load stock items par IDs
- **Fichier :** `base-material-price-unified.service.ts`

### P2 — Bundle POS

- Lazy `components/pos/*` lourds
- `npm run analyze` pour chunks

### P2 — Cache

- KPI cache invalidation on publish ✅
- Pas de Redis — acceptable local
- CDN Netlify/Vercel static assets

## Mesures recommandées

```bash
npm run perf:audit
npm run analyze
npx playwright test e2e/smoke-orion.spec.ts
```

## Objectifs Lighthouse (cible)

| Page | LCP | TBT |
|---|---|---|
| Dashboard | < 2.5s | < 200ms |
| POS | < 3s | < 300ms |
| Backoffice | < 3s | < 400ms |

## Quick wins (S effort)

1. Batch stock enrich matières list API
2. `React.memo` sur lignes table chips
3. `dynamic()` import drawer/modal backoffice
