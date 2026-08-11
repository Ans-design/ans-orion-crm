# Migration Postgres — FIN-01 (montants Int MGA)

Procédure pour basculer Neon / Postgres prod après les suites locales 4–6 (SQLite déjà en `Int`).

## Prérequis

1. Backup Neon (snapshot / `pg_dump`) **avant** toute altération.
2. Déployer le code qui lit déjà des `Int` (suites 4–6) — dual-read Float n’est plus nécessaire.
3. Environnement : `USE_PRODUCTION_DB=true`, `DATABASE_URL=postgresql://…`

## Étapes recommandées

### 1. Staging / branche preview

```bash
# Parité locale Docker (optionnel)
docker compose -f docker-compose.postgres.yml up -d
# Voir docs/POSTGRES_DOCKER_LOCAL.md

node scripts/db-migrate-postgres.mjs --env .env.postgres.local
```

### 2. Arrondi pré-cast (si colonnes encore Float en prod)

Sur un clone staging uniquement :

```sql
-- Exemple ledger (adapter aux tables encore Float)
UPDATE "Commande" SET total = ROUND(total), acompte = ROUND(acompte), reste = ROUND(reste);
UPDATE "Paiement" SET montant = ROUND(montant);
-- … mêmes familles que scripts/migrate-money-float-to-int*.ts
```

Ou rejouer les scripts d’arrondi pointés vers `DATABASE_URL` Postgres (tester d’abord en dry-run).

### 3. Alter Float → Int

- Preferer `prisma migrate deploy` si migrations SQL versionnées existent.
- Sinon `prisma db push` **uniquement** sur staging (jamais en aveugle sur prod).
- Vérifier : `SELECT pg_typeof(total) FROM "Commande" LIMIT 1;` → `integer`.

### 4. Smoke post-bascule

```bash
npm run smoke:finance
npm run reconcile:money
npx vitest run tests/remediation-suite4-int-money.test.ts
```

### 5. Rollback

Restaurer le snapshot Neon / dump pris à l’étape 0. Le code Int lit aussi des valeurs entières stockées en Float castées — mais le schéma doit revenir Float si le dump est pré-migration.

## Hors scope cette procédure

- Archives Excel PRIX 2026 (PRX) — gated runtime, pas une migration DB.
- Conversion des % / dimensions (restent Float volontairement).

## Extension 2026-08 — split `priceModifier`

Voir **`docs/MONEY_MIGRATION_RUNBOOK.md`** (préflight → colonnes `priceAddonAr` / `priceMultiplier` → backfill → reconcile → drop différé).  
Migration SQL : `prisma/migrations/20260805120000_money_option_modifier_split`.

## Références

- `docs/MONEY_POLICY.md`
- `docs/MONEY_SEMANTIC_INVENTORY.md`
- `docs/POSTGRES_DOCKER_LOCAL.md`
- Backups locaux SQLite : `prisma/dev.db.bak-fin01-suite4` … `suite6`, `bak-money-integrity`
