# Intégration plan A→Z — ANS ORION

Statut d'intégration du guide `prompts_AZ_cursor_hostinger_ans_orion.txt`.

| Étape | Intitulé | Statut | Livrables |
|-------|----------|--------|-----------|
| **A** | Documentation racine | ✅ | `docs/ARCHITECTURE.md`, `BACKOFFICE.md`, `DATABASE.md`, `API.md`, `HOSTINGER.md`, `PERFORMANCE.md`, `WORKFLOWS.md`, `CURSOR_RULES.md` |
| **B** | Règles Cursor | ✅ | `.cursor/rules/project.mdc`, `backend.mdc`, `ui-ux.mdc`, `hostinger.mdc`, `backoffice.mdc`, `performance.mdc` |
| **C** | Audit codebase | ✅ | `docs/AUDIT_CODEBASE.md` |
| **D** | Hostinger cible | ✅ | Scripts existants + `docs/HOSTINGER_DEPLOYMENT.md` |
| **E** | Variables .env | ✅ | `.env.example` + `docs/ENVIRONMENT.md` |
| **F** | Prisma + DB | ✅/🔄 | `lib/prisma.ts`, Postgres prod ; doc MySQL = option future |
| **G** | Schéma métier | ✅ | Schéma existant 97 modèles + `docs/DATABASE_SCHEMA_PROPOSAL.md` |
| **H** | Services métier | ✅ | `article.service.ts`, `pricing.service.ts`, `stock-service.ts`, `workflow.service.ts`, `permission.service.ts`, `production.service.ts`, `finance.service.ts`, `sync.service.ts`, `audit-log.service.ts`, `health.service.ts` |
| **I** | Health API | ✅ | `/api/health`, `/api/health/db`, `/api/admin/system-status` |
| **J** | Sidebar domaines | ✅ | `lib/modules/` — 14 groupes |
| **K** | Fusion Backoffice | ✅ | `/administration/*` |
| **L** | Shell léger | ✅ | `BackofficeWorkspace` + lazy panels |
| **M** | Catalogue compact | ✅ | `article-catalog-page.tsx` + CRUD |
| **N** | Modèles articles | ✅ | `lib/data/article-templates.ts`, API, panel `/administration/modeles-articles` |
| **O** | Flux & statuts | ✅ | `business-workflow.ts`, API, panel `/administration/flux-statuts` |
| **P** | Prix & formules | ✅ | Moteur dynamique + onglet prix |
| **Q** | Stock dépendances | ✅/🔄 | `stock-service`, `StockAvailabilityService` ; liens article-stock partiels |
| **R** | POS connecté | ✅ | `/api/pos/catalogue`, `price-preview`, `pricing`, `stock-check`, `article/[id]/config` |
| **S** | Devis→Commande→GPAO | ✅/🔄 | Services existants ; workflow panel documenté |
| **T** | Centre sync | ✅ | `/api/backoffice/sync-diagnostics`, panel `/administration/synchronisation` |
| **U** | Import/Export | ✅ | Panel `/administration/import-export` + APIs admin-config |
| **V** | ANS Talk Communication | ✅/🔄 | Module sidebar `/messagerie` ; bulle flottante conservée (zéro suppression) |
| **W** | Performance frontend | ✅/🔄 | `docs/PERFORMANCE.md` + lazy-load existant |
| **X** | Playwright E2E | ✅ | 10 specs + `test:e2e:prod` 10/10 |
| **Y** | Checklist deploy | ✅ | `docs/DEPLOY_CHECKLIST.md` |
| **Z** | Roadmap lots | ✅ | `docs/ROADMAP_EXECUTION.md` |

## Reste à maturer (lots 2–8)

- Catalogue 100 % DB (réduire `lib/data/catalogue.ts`)
- Migrations Prisma versionnées
- Table `ArticleTemplate` en DB
- E2E RH / finance / GPAO
- Sécurité finale (lot 8)

## Validation

```bash
npm run build
npm run test:e2e:prod
npm run hostinger:healthcheck
```
