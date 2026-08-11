# PostgreSQL local — ANS ORION (dev / tests parité prod)

Démarre une base PostgreSQL 16 locale pour tester migrations et requêtes sans toucher Neon.

## Démarrage

```bash
docker compose -f docker-compose.postgres.yml up -d
```

## URL

Copier dans `.env.postgres.local` (ne pas committer) :

```env
DATABASE_URL="postgresql://orion:orion_dev@127.0.0.1:5433/ans_orion?schema=public"
USE_PRODUCTION_DB=true
```

## Migrations

```bash
# Charger l'env Postgres puis déployer les migrations
npm run db:migrate:deploy
# ou
node scripts/db-migrate-postgres.mjs --env .env.postgres.local
```

## Arrêt

```bash
docker compose -f docker-compose.postgres.yml down
```

## Notes

- Port **5433** pour éviter conflit avec un Postgres système sur 5432.
- Volume persistant `orion_pg_data` — `down -v` supprime les données (destructif).
- Le schéma Prisma reste `provider = "sqlite"` en dev quotidien ; le script `db-migrate-postgres.mjs` patche temporairement en `postgresql`.
