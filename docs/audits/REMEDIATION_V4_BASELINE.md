# REMEDIATION V4 — Baseline

| Champ | Valeur |
|-------|--------|
| Date | 2026-07-30 |
| Node | v24.15.0 |
| npm | 11.12.1 |
| Git | **pas de dépôt `.git`** (commits non applicables) |
| AGENTS.md | absent |

## Scripts disponibles

`dev:local`, `dev:clean`, `build`, `lint`, `typecheck`, `test` (vitest), `test:e2e:smoke`, `db:generate`, `db:push`

## Commandes baseline

| Commande | Exit | Notes |
|----------|-----:|-------|
| `npx prisma validate` | 0 | OK |
| `npx vitest run tests/permissions.test.ts tests/publication-pricing.test.ts` | 0 | 21 passed |
| `npm run typecheck` | *(à relancer après Lot A)* | — |
| `npm run build` | *(différé — long ; chunks .next déjà clean)* | — |
| `npm run test:e2e:smoke` | *(après Lot A si temps)* | — |

## État initial connu (preuves code)

- `middleware.ts` L21 : `PUBLIC_PAGES` contient `'/bat'` → **tout** `/bat/*` public via `startsWith`
- `PUBLIC_API_PREFIXES` : `/api/bat/client` OK pour jeton
- `requireRhAdmin` = admin **ou** manager → lecture paie ouverte aux managers
- `reports-service.ts` expose `masseSalarialeBrute` sans strip rôle
- `take: 5000` dans `base-material-price-unified.service.ts`
- Pas de git → pas de commit atomique possible

## Risques baseline

- Pas de git = pas de rollback commit ; corrections progressives + docs preuves
- E2E smoke non relancé en Phase 0 (serveur local peut être busy)
