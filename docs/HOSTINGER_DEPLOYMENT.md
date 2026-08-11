# Déploiement Hostinger — ANS ORION

## Configuration hPanel (Node.js Web App)

| Paramètre | Valeur |
|-----------|--------|
| Install command | `npm ci` |
| Build command | `npm run build` ou `npm run build:hostinger` |
| Start command | `npm run start -- -p $PORT` ou `npm run start:hostinger` |
| Node.js | 20.x (ou version LTS active Hostinger) |

## Interdictions

- ❌ `next export` (site statique)
- ❌ Supprimer les API routes
- ❌ Secrets en dur dans le code
- ❌ `prisma migrate reset` ou seed lourd au démarrage

## Workflow recommandé

0. `npm run staging:preflight` (tsc + CSP tests ; optionnel `SITE_URL=…` pour health distant)
1. `npm run typecheck`
2. `npm run lint`
3. `npm run build` / `npm run build:hostinger`
4. `npm test` / `npm run test:e2e:prod`
5. Push `main` → webhook ou `npm run hostinger:redeploy:session`
6. `npm run hostinger:healthcheck` (inclut `/api/health/ready`)

## Variables d'environnement

Copier depuis `.env.example` vers hPanel.  
Redéployer après toute modification d'env.

**Prod Hostinger :** `DATABASE_URL` doit être `postgres…` (jamais `file:`).  
`ALLOW_SETUP_DB` et `DEMO_MODE` restent **off**. Voir `docs/audit/PLAN_DEPLOIEMENT_HOSTINGER_RC.md`.

## Build sûr

- Préféré : `npm run build:hostinger` (generate PG + next build)
- `scripts/hostinger-build.mjs` : **ne fait plus** `db push --accept-data-loss`
- Schéma DB hors build, après backup validé

## Diagnostics

| Endpoint | Description |
|----------|-------------|
| `/api/health` | App alive, flags env |
| `/api/health/db` | Connexion DB |
| `/api/health/ready` | Readiness app + DB + env (inclus dans healthcheck) |
| `/api/admin/system-status` | Compteurs entités (admin) |

## Rollback simple

### Code

1. Redéployer l’artefact / commit stable précédent
2. Healthcheck

### Données

1. Restaurer dump PostgreSQL pré-migration
2. **Sans backup : ne pas migrer / ne pas push schéma**

## Fichiers déploiement repo

- `scripts/hostinger-redeploy-session.mjs`
- `scripts/hostinger-healthcheck.ts`
- `scripts/guard-hostinger-deploy.mjs` (bloque local)
- `deploy/hostinger/` (secrets `*.env` gitignorés)
