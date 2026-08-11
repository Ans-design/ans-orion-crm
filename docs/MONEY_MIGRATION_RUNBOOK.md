# Migration monétaire sûre — SQLite → PostgreSQL/Neon

Procédure progressive et réversible. **Aucune écriture Neon/prod sans autorisation explicite.**

## Choix de types

| Catégorie | Type retenu | Justification |
|-----------|-------------|---------------|
| Montants MGA opérationnels | `Int` (Int32) | Observé max local ≈ 1,25 M Ar ≪ 2,147 Md ; JSON natif |
| Si risque Int32 | `Decimal(18,0)` | Préféré à `BigInt` (sérialisation JSON sans custom replacer) |
| Pourcentages (TVA, marge %, remise %) | `Float` / décimal | **pas** des montants |
| Multiplicateurs options | `Float` `priceMultiplier` | ratio additif (0.1 = +10 %) |
| Supplément option Ar | `Int` `priceAddonAr` | séparé du multiplicateur |
| Dimensions / quantités / stock physique | `Float` | **volontairement** non Int |
| `priceModifier` | `Float` legacy | dual-read jusqu’au drop différé |

## Étapes (1→10)

1. **Préflight lecture seule**  
   `DATABASE_URL=… npx tsx scripts/preflight-money-integrity.ts --json reports/money-preflight.json`  
   Exit 2 = exceptions (fractionnaires / hors plage / ambiguës) → **stop**, pas d’arrondi silencieux.

2. **Détection non-entiers** — incluse dans le préflight (`fractional_amount`).

3. **Détection hors plage** — `out_of_int32` / `near_int32_limit_warn`.

4. **Nuls inattendus** — montants Int métier `@default(0)` ; nulls optionnels documentés.

5. **Nouveaux champs** (additif)  
   - Local SQLite : `npx prisma db push` (après backup `prisma/dev.db`)  
   - Postgres : migration `20260805120000_money_option_modifier_split`

6. **Backfill contrôlé**  
   `npx tsx scripts/migrate-price-modifier-split.ts --dry-run`  
   puis `--apply` seulement si `exceptionCount=0`  
   Prod : `ALLOW_MONEY_MIGRATION_WRITE=1` requis si `USE_PRODUCTION_DB=true`.

7. **Comparaison ancien/nouveau**  
   `npx tsx scripts/reconcile-price-modifier.ts` (exit 0 = OK)

8. **Contraintes** — applicatives via `parseMgaStrict` / préflight ; CHECK SQL optionnel staging.

9. **Bascule applicative** — déjà : `resolvePriceAddonAr` / `resolvePriceMultiplier` + dual-write writes.

10. **Retrait différé** de `priceModifier` — **après** ≥1 cycle prod stable ; migration DROP séparée (hors cette livraison).

## Staging

```bash
# Snapshot Neon staging
cp prisma/dev.db prisma/dev.db.bak-money-integrity   # local
npx prisma db push                                   # local schema
npx tsx scripts/migrate-price-modifier-split.ts --dry-run
npx tsx scripts/migrate-price-modifier-split.ts --apply
npx tsx scripts/reconcile-price-modifier.ts
npx tsx scripts/preflight-money-integrity.ts
npm run smoke:finance
npx vitest run tests/remediation-money-integrity.test.ts tests/remediation-finance-money.test.ts
npm run typecheck && npm run lint && npm run build
```

Postgres staging (après autorisation) :

```bash
# provider temporaire via scripts/db-migrate-postgres.mjs
node scripts/db-migrate-postgres.mjs --env .env.postgres.local
ALLOW_MONEY_MIGRATION_WRITE=1 npx tsx scripts/migrate-price-modifier-split.ts --apply
```

## Production Neon

1. Autorisation écrite humaine.  
2. Snapshot Neon.  
3. Déployer code dual-read **avant** backfill.  
4. `migrate deploy` colonnes additives.  
5. Préflight → backfill → reconcile → smoke.  
6. Marquer `FIN-01-NEON` / `ANO-NEON` **FIXED_VERIFIED** uniquement après cette vérif.

## Rollback

1. Données : `npx tsx scripts/rollback-price-modifier-split.ts --apply` (remet addon/mult à 0 ; legacy intact).  
2. App : lectures via `resolve*` retombent sur `priceModifier`.  
3. Schema : `DROP COLUMN "priceAddonAr", "priceMultiplier"` seulement si app rollback déployé.  
4. SQLite : restaurer `prisma/dev.db.bak-money-integrity`.

## Scripts npm

- `preflight:money`
- `migrate:price-modifier`
- `reconcile:price-modifier`
- `rollback:price-modifier`

## Références

- `docs/MONEY_POLICY.md`
- `docs/MONEY_SEMANTIC_INVENTORY.md`
- `docs/POSTGRES_FIN01_MIGRATION.md`
