# Matrice RBAC API — Vague 2 (échantillon critique)

| Date | 2026-07-18 |
|------|------------|
| Portée | Routes écriture P0 corrigées + scan Auth exhaustif |
| Couverture Auth 387 routes | **Complète** — protégées ou allowlistées |
| Matrice permission par handler | **Partielle** — densification progressive |

## Écritures durcies (cette session)

| Route | Méthodes | Permission réelle | Test refus | Statut |
|-------|----------|-------------------|------------|--------|
| `/api/backoffice/repair-payment-drift` | POST | `config:publish` | `v2-auth-hostinger-guards` | Corrigé |
| `/api/admin-backoffice/repair-payment-drift` | POST | re-export ↑ | idem | Corrigé |
| `/api/admin-backoffice/pricing/base-materials` | POST | `tarifs:write` | guards | Corrigé |
| `/api/admin-backoffice/pricing/base-materials?sync=1` | GET+side-effect | `tarifs:write` | guards | Corrigé |
| `/api/admin-backoffice/pricing/base-materials/backfill-prices` | POST | `tarifs:write` | guards | Corrigé |
| `*/import-excel` (tiers, regles, catalogue-pos, chips, flux, articles, variables) | POST | write only | guards | Corrigé |
| `/api/admin-backoffice/annexes/import-excel` | POST | `users:manage` | guards | Corrigé |
| `/api/admin-backoffice/packaging?seed=1` | GET+seed | `tarifs:write` | code | Corrigé |
| `/api/setup-db` | POST | SETUP_SECRET + `ALLOW_SETUP_DB` en prod | guards | Corrigé |

## Familles déjà saines (audit lecture)

factures, paiements, stock CRUD, finance, majority admin-backoffice writes avec `tarifs:write` / `requireAdmin`.

## Risques résiduels

| Risque | Gravité | Action |
|--------|---------|--------|
| Cron secret-only (`/api/cron/*`) | P1 | Secrets forts + rotation ; pas de session |
| Matrice permission par handler | P1 | Scan Auth fait ; compléter le niveau de permission |
| Overrides UI `/admin/permissions` vs serveur | P1 | D-007 ouvert |
| Nav `finance` vs API | P2 | **VF-P1** : `ROLE_PROFILES.finance.authRoles` inclut `finance` + `caisse` |
| Rôle `demo` profil Direction | P1 | Menus larges ; API démo restreinte (divergence volontaire) |

## Scan exhaustif (Vague 2 suite)

| Métrique | Valeur |
|----------|--------|
| Fichiers `app/api/**/route.ts` | **387** |
| Handlers HTTP | **543** |
| Writes (POST/PATCH/PUT/DELETE) | **300** |
| Writes avec permission/admin explicite | ~84 % |

### Writes faibles traités

| Route | Avant | Après |
|-------|-------|-------|
| Equipe messages/suggestions POST | `*:read` | `requireAuth` |
| Imports / repair / backfill | `config:view` OR | write only (session précédente) |

### Résiduels acceptables / documentés

| Route | Guard | Note |
|-------|-------|------|
| `/api/pricing/simulate` POST | `tarifs:read` | Calcul non persistant — OK |
| `/api/auth/*` | public | Login/reset — OK |
| `/api/cron/*` | CRON_SECRET | Secret fort requis |
| `/api/setup-db` | SETUP + ALLOW_SETUP_DB | Fail-closed prod |

Matrice ligne-à-ligne complète : à densifier progressivement ; l’échantillon P0 + scan compteurs couvrent le critère « écritures critiques classées ».

## Preuve RC automatisée

- `npm run audit:api-auth` : **387 routes OK**
- `tests/v2-rc-auth-automations.test.ts` : middleware `/api`, scan Auth, refus démo/lecture et garde anti-double conversion devis
- `tests/v2-auth-hostinger-guards.test.ts` : écritures P0 sans escalade par permission de lecture
