# ANS ORION — Hostinger

## URL production

https://darkorchid-badger-644294.hostingersite.com

## Type de déploiement

**Node.js Web Application** — Next.js avec API routes (pas `next export`).

## Scripts npm

| Script | Usage |
|--------|-------|
| `npm run build:hostinger` | Build prod |
| `npm run start:hostinger` | Démarrage `$PORT` |
| `npm run hostinger:redeploy:session` | Redéploiement hPanel |
| `npm run hostinger:healthcheck` | Vérif `/api/health` + DB |

## Variables d'environnement (hPanel)

Voir `docs/ENVIRONMENT.md` et `.env.example`.

Obligatoires : `DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `HOSTINGER_SITE_URL`.

## Healthchecks post-déploiement

```bash
curl https://darkorchid-badger-644294.hostingersite.com/api/health
curl https://darkorchid-badger-644294.hostingersite.com/api/health/db
```

## E2E prod

```bash
npm run test:e2e:prod
```

## Logs

hPanel → Node.js App → Logs (build + runtime)

## Rollback

Redéployer commit précédent via Git webhook ou `hostinger:redeploy:session`.

Détail procédure : `docs/HOSTINGER_DEPLOYMENT.md`
