# Rapport tests Vague 2 + Vague Finale

| Date | 2026-07-19 |
|------|------------|
| Copie | PROJET AVANT FINAL (sans `.git`) |

## Manifeste de validation

| Contrôle | Statut | Preuve |
|----------|--------|--------|
| `npm run typecheck` | **Exécuté** | exit 0 |
| Vitest A→F + RC Auth | **Exécuté** | 53 tests OK |
| Vitest VF-QA01 comportemental | **Exécuté** | 15 tests OK |
| Vitest UX harmonize (radius 7px) | **Exécuté** | 4 tests OK |
| `npm run audit:api-auth` | **Exécuté** | 387 routes protégées/allowlistées |
| `npx next build` | **Exécuté** | exit 0 (2026-07-19) |
| `npm run lint` | **Non exécuté** | Volume / dette ESLint |
| `npm run test` complet | **Non exécuté** | Smoke RC suffisant pour lots |
| `npm run build:hostinger` | **Non exécuté** | Staging isolé + PG requis |
| E2E Playwright | **Bloqué** | DB jetable + auth staging requis |
| Sync Admin→POS E2E | **Bloqué** | Recette manuelle / base isolée |
| Repair payment drift | **Bloqué** | D-012 + backup |
| Mesures p50/p95 runtime | **Non exécuté** | Stub → voir budgets perf |

## Suites smoke (session Vague Finale)

| Suite | Commande | Résultat |
|-------|----------|----------|
| Typecheck | `npm run typecheck` | **exit 0** |
| Canon finance / concurrence / workflow / auth / UX | vitest ciblé 6 fichiers | **53 OK** |
| VF-QA01 comportemental | `tests/vf-qa01-behavioral.test.ts` | **15 OK** |
| Auth API | `npm run audit:api-auth` | **387 OK** |
| Build | `npx next build` | **exit 0** |

## Nature des preuves

| Type | Exemples | Limite |
|------|----------|--------|
| Comportemental (fonctions pures / services) | `vf-qa01-behavioral`, golden pricing, stock-quantity | OK local |
| Scan source (garde-fous structure) | parties de A→F historiques | Complété par VF-QA01 |
| Intégration DB concurrente | — | **Non exécuté** (pas de double TX Prisma) |
| E2E mutatif | audit-p0, finance | **Interdit** sans DB jetable |

## Régressions

Aucune détectée sur suites ciblées après VF-P0A/P0B/QA01/P1.
