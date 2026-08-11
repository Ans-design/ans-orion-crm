# Budgets performance — Release Candidate (V2-09 / VF-P2)

| Date | 2026-07-19 |
|------|------------|
| Mesures p50/p95 runtime | **NON EXÉCUTÉ** (staging requis) |
| Scan statique | `npm run perf:audit` — exécuté (imports catalogue / layouts) |

## Budgets cibles (à mesurer en staging)

| Parcours | Budget p95 indicatif | Notes |
|----------|----------------------|-------|
| Login | < 2 s | |
| Dashboard | < 3 s | lazy charts |
| Catalogue POS | < 2 s | lecture pure VF-P0B (plus de merges au GET) |
| Calcul prix | < 800 ms | calculatePrice |
| Sauvegarde devis | < 2 s | |
| Publication Admin | < 5 s | inclut `runPosCatalogueMaintenance` |

## Correctifs déjà en place

- Lazy-load panels / messagerie
- Pagination listes > 50 (défaut ON)
- Debounce recherche 250 ms
- Virtualisation listes via `computeWindowedSlice` / `useWindowedRows` (seuil 60)
- Pas de polling Hostinger en local
- Catalogue POS : merges hors chemin lecture (VF-P0B)

## Avant / après Vague Finale (statique)

| Indicateur | Avant | Après VF |
|------------|-------|----------|
| Merges au premier GET catalogue | Oui (side-effect) | Non — sync explicite |
| Radius tokens | 10px | 7px (règle maître) |
| Build Next First Load JS shared | ~89 kB (build 2026-07-19) | inchangé ordre de grandeur |

## Suite staging

1. Lighthouse / Web Vitals login + dashboard + POS + `/commandes/[id]`
2. `ANALYZE=true npm run build` pour bundles
3. Journaliser p50/p95 API critiques
