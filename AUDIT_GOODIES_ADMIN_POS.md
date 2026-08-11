# Audit — Goodies Admin → POS synchronisés

Date : 2026-07-11

## Livré

### Tables Prisma
- `GoodiesArticleModel` — modèles / prix vierge
- `GoodiesPrintingTechnique` — techniques + prix
- `GoodiesAddon` — suppléments / params PVC
- `GoodiesOptionDependency` — ex. housse type → formats

### Sync
- [`lib/services/catalog-options-sync.service.ts`](lib/services/catalog-options-sync.service.ts)
- Seed : `npm run seed:goodies`
- Sync : `npx tsx scripts/sync-goodies-pos.ts`
- Branché dans sync-all Direct Sale / pricing tables

### Prix
- [`lib/pricing/goodies-pricing.ts`](lib/pricing/goodies-pricing.ts) : vierge + technique + addons
- Porte-clé PVC souple : `(PVC A4 / diviseur) + découpe + attache + technique`
- PVC A4 lu depuis ISF publié (fallback addon Admin)
- Branché dans `dynamic-engine.ts` (ignore `priceTiers` hardcodés)

### Admin
- Page `/administration/goodies` — 4 onglets + corbeille + Excel (feuille / classeur 4 feuilles) + Sync POS
- Menu Catalogue → Goodies
- Feuilles : `01_Goodies_Modeles`, `02_Goodies_Techniques`, `03_Goodies_Supplements`, `04_Dependances_Options`

### POS
- Chips Admin via `ProductOption*` + overrides (labels actifs + dépendances `optionsFilter`)
- Une carte par article `gd-*`
- `visiblePOS=false` / `active=false` → chips masquées

## Corrections 2026-07-11
- Fix import Excel (`parseXlsxFile` = tableau, pas `{ rows }`)
- Export/import classeur 4 feuilles
- Corbeille soft-delete + restauration

## Tests acceptation (unitaires)

```
tapis 9000 + 1000 = 10000 ✓
stylo 4000 + 500 = 4500 ✓
PVC (13000/20)+50+300 = 1000 ✓
housse téléphone filtre formats ✓
```

`npx vitest run tests/goodies-*.test.ts`
