# Roadmap exécution — ANS ORION (lots A→Z)

## Lot 1 — Stabilisation Hostinger ✅

- package.json scripts build/start/hostinger
- `/api/health`, `/api/health/db`
- Santé système backoffice + retry
- E2E prod 10/10
- **Validation :** healthcheck OK

## Lot 2 — Base & backend ✅

- Prisma + Postgres prod (Neon)
- 66 services existants + façades `*.service.ts`
- API articles backoffice CRUD
- API POS catalogue (hybride + couverture DB `catalogue-coverage`)
- Audit logs (`lib/audit.ts`)
- Articles DB-only publiés visibles au POS
- Mode `database-primary` : POS alimenté uniquement par profils publiés (≥95 % couverture)
- Mode `database-full` : couverture 100 % → sans fallback statique
- Scripts migrations versionnées (`db:migrate:baseline`, `db:migrate:neon`, `db:migrate:resolve:neon`)

## Lot 3 — Backoffice ✅/🔄

- Fusion `/administration/*`
- Shell léger + lazy tabs
- Catalogue compact + CRUD UI
- Modèles d'articles (templates API)
- Prix & formules (moteur dynamique existant)
- **Reste :** Variables: sync preserve + getGlobalPricingConfig DB-first + coeffs face/finition seedés + **UI admin CRUD PricingVariable** (`/administration/variables`) — **reste :** CSP enforce

## Lot 4 — Flux métier ✅

- Référentiel statuts (`status-registry.ts`)
- Panel Flux & statuts backoffice (édition admin)
- Devis → commande (`devis-accept-service`)
- Commande → GPAO (`gpao-dossier-service`)
- **Transitions configurables DB** (`WorkflowTransitionRule`, seed, API PATCH/POST)
- Runtime commande lit la map depuis DB (`workflow-transition-service`)

## Lot 5 — Synchronisation ✅

- `/api/admin/sync-status`
- `/api/backoffice/sync-diagnostics` (+ `driftReport`)
- Centre sync backoffice (alertes drift détaillées)
- POS ↔ catalogue hybride
- `sync-drift-service` : analyse config/catalogue/DB/pricing
- Alertes auto drift : ticker cockpit, cron quotidien, notification admin (dédoublonnage 24h)

## Lot 6 — Performance 🔄

- Lazy backoffice/talk
- Pagination API plafonnée (`parseListParams`, max 100)
- `docs/PERFORMANCE.md` + `npm run perf:audit` + `npm run analyze`
- Fix trace `demo.db` exclue en build Postgres / Hostinger
- `optimizePackageImports` recharts, date-fns
- Virtualisation : commandes/stock/devis/livraisons/paiements + **factures** (`VirtualizedList`) + **clients** (cartes `VirtualizedList` ; tableau déjà `OrionColumnTable`)
- **Reste :** E2E prod stabilisé, catalogue liste ≥60 lignes

## Lot 7 — Tests ✅/🔄

- Playwright 11 specs + prod smoke (`rh-finance-gpao`)
- Vitest 858+ tests
- E2E RH, finance, GPAO (`e2e/rh-finance-gpao.spec.ts` — APIs + pages + sidebar)
- **Reste :** E2E CRUD RH (création employé) en prod optionnel
- Fix E2E prod : sélecteur `#login-id` (matricule/email)

## Lot 8 — Sécurité finale 🔄

- Comptes démo masqués prod (`isProductionDeploy`, login fail-closed)
- Hostinger : `DISABLE_QUICK_LOGIN`, `ALLOW_PUBLIC_SIGNUP=false`, `ALLOW_V29_AUTH=false`
- Rate limit auth/cron renforcé (middleware)
- En-têtes sécurité (`lib/security-headers.ts`)
- CSP **Report-Only** (`Content-Security-Policy-Report-Only`) — pas d’enforce
- `docs/SECURITY.md`
- **Reste :** 2FA optionnel, CSP enforce (après validation POS/cartes), permissions granulaires

## Vague Finale (2026-07-19) — statut

- VF-00 baseline + docs : **fait**
- VF-P0A fail-closed data-loss : **fait**
- VF-P0B catalogue lecture pure : **fait**
- VF-QA01 preuves comportementales : **fait**
- VF-P1 radius 7px + nav finance : **fait**
- VF-P2/P3 budgets + checklist RC : **fait (doc)**
- **NO-GO PROD** tant que backup PG manquant

## Ordre recommandé (prochaines sessions)

1. Backup PG restaurable + D-012 repair drift (humain)
2. Staging Hostinger isolé — **préflight local** : `npm run staging:preflight` (+ `SITE_URL=…` pour health distant) ; `build:hostinger` sur machine de release
3. E2E sync Admin→POS — **contrat lecture** : `e2e/admin-pos-sync.spec.ts` ; mutations publish/archive encore bloquées sans DB jetable
4. Variables 100 % DB (Lot 3) : sync preserve + DB-first merge + coeffs + UI CRUD — **reste** CSP enforce

## Critères validation globale

- Build OK
- E2E prod OK
- Backoffice configure POS sans code change
- Hub commande relie tous modules
- Zéro régression fonctionnelle
