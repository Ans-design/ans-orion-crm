# Audit codebase — ANS ORION

*Généré pour intégration plan A→Z. Ne pas modifier le code depuis ce seul document.*

## Structure

- `app/(app)/` — ~90 pages authentifiées
- `app/api/` — ~200 endpoints
- `lib/services/` — 66 services métier
- `components/` — ~212 composants
- `prisma/schema.prisma` — 97 modèles

## Sidebar

Registry : `lib/modules/module-registry.ts` + `role-registry.ts`  
14 groupes métier, permissions via `permission-matrix.ts`

## Problèmes classés

### Critique

| # | Problème | Fichier / zone |
|---|----------|----------------|
| C1 | Catalogue encore code-first | `lib/data/catalogue.ts` (~16 catégories) |
| C2 | Pas de migrations Prisma versionnées | `prisma/` sans `migrations/` |
| C3 | Dual entry admin legacy | `/admin/pricing`, `/admin-control` |

### Haut

| # | Problème |
|---|----------|
| H1 | Services fragmentés (pas de façade unique pricing/sync) |
| H2 | SQLite default schema vs Postgres prod |
| H3 | Documentation API absente (corrigé : `docs/API.md`) |
| H4 | Modèles d'articles templates non en DB |

### Moyen

| # | Problème |
|---|----------|
| M1 | ~10 liens legacy `/admin/pricing` dans modules |
| M2 | E2E ne couvre pas RH/finance/GPAO complet |
| M3 | Import/export backoffice dispersé |
| M4 | Bulle ANS Talk flottante coexiste avec `/messagerie` |

### Faible

| # | Problème |
|---|----------|
| F1 | Noms services inconsistants (`StockAvailabilityService.ts`) |
| F2 | Roadmap 40 étapes txt seul fichier docs historique |

## Données mockées / statiques

`lib/data/` : catalogue, global-pricing, materials-config, tariffs, status-registry, base-rules

## useEffect / loading

- Backoffice : corrigé avec `BackofficeErrorState` + retry
- Dashboard charts : garde `!chartsLoading`

## Routes cassées potentielles

Redirects `next.config.js` couvrent legacy admin — vérifier liens emails access-request

## Recommandations

1. Migrer catalogue vers DB progressivement
2. Introduire `prisma migrate` pour prod
3. Unifier façades services (`lib/services/*.service.ts`)
4. Étendre E2E par domaine
