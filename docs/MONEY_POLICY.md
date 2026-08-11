# Politique monétaire MGA (ANS ORION)

## Règle

- Devise opérationnelle : **MGA (Ariary)**.
- Précision runtime : **entier d’ariary** (`Int` Prisma) — pas de centimes.
- Source de vérité calculs : `lib/money/mga.ts` + `lib/money/option-modifier.ts` + champs `Int` CRM / stock / RH / grilles Admin.
- Interdit en production : calculs financiers en `Float` JS non arrondis ; `parseFloat` sur montants opérationnels ; comparaison approximative.

## Choix de type

- Montants MGA : **`Int`** (plafond Int32 documenté ; upgrade `Decimal(18,0)` si préflight hors plage).
- % et multiplicateurs : **décimal explicite** (`Float` / champs dédiés) — jamais mélangés avec un montant Ar.
- `ProductOptionValue` : `priceAddonAr` (Int) + `priceMultiplier` (Float) ; `priceModifier` legacy dual.

## Migration FIN-01

1. Helpers + dual-write `*Ariary` (phase 1).
2. Ledger CRM Float→Int (suite 4).
3. Opérationnel Float→Int (suite 5) — Tarif, stock $, caisse, RH, achats.
4. Grilles Admin Float→Int (suite 6) — BasePrinting, SalePrice2026, goodies, textile, photo, event, packaging…
5. Colonnes shadow `*Ariary` retirées — lecture directe des `Int`.
6. Split sémantique `priceModifier` (2026-08) — voir `docs/MONEY_MIGRATION_RUNBOOK.md`.

## Rollback local

- Suite 4 : `prisma/dev.db.bak-fin01-suite4`
- Suite 5 : `prisma/dev.db.bak-fin01-suite5`
- Suite 6 : `prisma/dev.db.bak-fin01-suite6`
- Money integrity : `prisma/dev.db.bak-money-integrity`
- Puis `npx prisma generate`

## Encore en Float (volontaire)

- Dimensions, quantités, facteurs de conversion
- Pourcentages (marge, TVA, remises %)
- `priceMultiplier` ; `priceModifier` legacy (drop différé)

## Postgres production

Voir `docs/MONEY_MIGRATION_RUNBOOK.md` et `docs/POSTGRES_FIN01_MIGRATION.md`.  
Inventaire : `docs/MONEY_SEMANTIC_INVENTORY.md`.
